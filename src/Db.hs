{-# LANGUAGE OverloadedStrings #-}

module Db where

import Control.Concurrent.MVar (MVar, modifyMVar)
import Control.Exception (SomeException, throwIO, try)
import qualified Data.ByteString.Char8 as BS8
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.FromRow (FromRow (..), field)
import System.Environment (lookupEnv)
import Models

-- | URL do banco: vem da variavel de ambiente DATABASE_URL (na nuvem)
--   ou cai no PostgreSQL local (no PC).
getDbUrl :: IO BS8.ByteString
getDbUrl =
  BS8.pack . fromMaybe "postgres://postgres:postgres@localhost:5432/lambda_arcade"
    <$> lookupEnv "DATABASE_URL"

tryAny :: IO a -> IO (Either SomeException a)
tryAny = try

-- | Executa uma acao com a conexao guardada no MVar (uma requisicao por vez).
--   Se a acao falhar E a conexao estiver morta (ex.: o Neon dormiu apos
--   5 min parado e derrubou a conexao), abre uma conexao nova, guarda no
--   MVar e tenta a acao de novo uma unica vez.
withConn :: MVar Connection -> (Connection -> IO a) -> IO a
withConn connVar action = modifyMVar connVar $ \conn -> do
  resultado <- tryAny (action conn)
  case resultado of
    Right x -> pure (conn, x)
    Left erro -> do
      vivo <- tryAny (query_ conn "SELECT 1" :: IO [Only Int])
      case vivo of
        Right _ -> throwIO erro -- conexao ok: o erro era outro, repassa
        Left _ -> do
          putStrLn "Conexao com o banco caiu; reconectando..."
          _ <- tryAny (close conn)
          novaConn <- connectPostgreSQL =<< getDbUrl
          x <- action novaConn
          pure (novaConn, x)

data PlayerRow = PlayerRow
  Int Text Int Int Int Int Text Text Text Text Text

instance FromRow PlayerRow where
  fromRow = PlayerRow
    <$> field <*> field <*> field <*> field <*> field <*> field
    <*> field <*> field <*> field <*> field <*> field

defaultItems :: [Text]
defaultItems =
  [ "purple_classic"
  , "coral_pack"
  , "sunset"
  , "trail_none"
  , "pet_none"
  ]

getOrCreatePlayer :: MVar Connection -> Text -> IO PlayerProfile
getOrCreatePlayer connVar uname = withConn connVar $ \conn -> do
  rows <- query conn
    "INSERT INTO players (username) VALUES (?) \
    \ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username \
    \RETURNING id, username, stars, best_score, best_ante, runs_completed, \
    \equipped_skin, equipped_acc, equipped_theme, equipped_trail, equipped_pet"
    (Only uname) :: IO [PlayerRow]
  let PlayerRow pid name stars bScore bAnte runsDone skin acc theme trail pet = head rows
  unlocks <- query conn
    "SELECT category, unlock_key FROM player_unlocks WHERE player_id = ?"
    (Only pid) :: IO [(Text, Text)]
  let items = defaultItems ++ [k | ("item", k) <- unlocks]
      achs  = [k | ("achievement", k) <- unlocks]
      cards = [k | ("card", k) <- unlocks]
  pure $ PlayerProfile name stars bScore bAnte runsDone skin acc theme trail pet items achs cards

updateWardrobe :: MVar Connection -> Text -> WardrobeReq -> IO (Either Text PlayerProfile)
updateWardrobe connVar uname req = do
  res <- withConn connVar $ \conn -> do
    [(pid, stars)] <- query conn "SELECT id, stars FROM players WHERE username = ?" (Only uname) :: IO [(Int, Int)]
    owned <- query conn
      "SELECT 1 FROM player_unlocks WHERE player_id = ? AND category = 'item' AND unlock_key = ?"
      (pid, wItemId req) :: IO [Only Int]
    let alreadyOwned = (wItemId req `elem` defaultItems) || not (null owned)
    if not alreadyOwned && stars < wPrice req
      then pure (Left "Estrelas insuficientes.")
      else do
        if not alreadyOwned
          then do
            _ <- execute conn "UPDATE players SET stars = stars - ? WHERE id = ?" (wPrice req, pid)
            _ <- execute conn "INSERT INTO player_unlocks (player_id, category, unlock_key) VALUES (?, 'item', ?) ON CONFLICT DO NOTHING" (pid, wItemId req)
            pure ()
          else pure ()
        let colSql = case wCategory req of
              "skin"  -> "UPDATE players SET equipped_skin = ? WHERE id = ?"
              "acc"   -> "UPDATE players SET equipped_acc = ? WHERE id = ?"
              "trail" -> "UPDATE players SET equipped_trail = ? WHERE id = ?"
              "pet"   -> "UPDATE players SET equipped_pet = ? WHERE id = ?"
              _       -> "UPDATE players SET equipped_theme = ? WHERE id = ?"
        _ <- execute conn colSql (wItemId req, pid)
        pure (Right ())
  case res of
    Left err -> pure (Left err)
    Right () -> Right <$> getOrCreatePlayer connVar uname

saveProgress :: MVar Connection -> Text -> ProgressReq -> IO PlayerProfile
saveProgress connVar uname pr = do
  _ <- withConn connVar $ \conn -> do
    [Only pid] <- query conn "SELECT id FROM players WHERE username = ?" (Only uname) :: IO [Only Int]
    inserted <- execute conn
      "INSERT INTO player_unlocks (player_id, category, unlock_key) VALUES (?, ?, ?) ON CONFLICT DO NOTHING"
      (pid, prCategory pr, prKey pr)
    if inserted > 0 && prReward pr > 0
      then do
        _ <- execute conn "UPDATE players SET stars = stars + ? WHERE id = ?" (prReward pr, pid)
        pure ()
      else pure ()
  getOrCreatePlayer connVar uname

saveRun :: MVar Connection -> SubmitRunReq -> IO PlayerProfile
saveRun connVar sr = do
  _ <- withConn connVar $ \conn -> do
    [Only pid] <- query conn "SELECT id FROM players WHERE username = ?" (Only (srUsername sr)) :: IO [Only Int]
    _ <- execute conn
      "INSERT INTO runs (player_id, game, seed, tier, score, hof_mult, code_submitted) VALUES (?, ?, ?, ?, ?, ?, ?)"
      (pid, srGame sr, srSeed sr, srTier sr, srScore sr, srHofMult sr, srCode sr)
    _ <- execute conn
      "UPDATE players SET stars = stars + ?, runs_completed = runs_completed + 1, \
      \best_score = GREATEST(best_score, ?), best_ante = GREATEST(best_ante, ?) WHERE id = ?"
      (srStarsWon sr, srScore sr, srTier sr, pid)
    pure ()
  getOrCreatePlayer connVar (srUsername sr)

getLeaderboard :: MVar Connection -> GameKind -> Maybe Int -> IO [LeaderboardEntry]
getLeaderboard connVar game mSeed = withConn connVar $ \conn -> do
  rows <- case mSeed of
    Just s -> query conn
      "SELECT p.username, r.score, r.hof_mult, r.tier \
      \FROM runs r JOIN players p ON p.id = r.player_id \
      \WHERE r.game = ? AND r.seed = ? ORDER BY r.score DESC LIMIT 10"
      (gameToText game, s)
    Nothing -> query conn
      "SELECT p.username, r.score, r.hof_mult, r.tier \
      \FROM runs r JOIN players p ON p.id = r.player_id \
      \WHERE r.game = ? ORDER BY r.score DESC LIMIT 10"
      (Only (gameToText game))
  pure [LeaderboardEntry u sc hm tr | (u, sc, hm, tr) <- rows]