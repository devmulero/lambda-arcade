{-# LANGUAGE OverloadedStrings #-}

module Main where

import Control.Concurrent.MVar (MVar, newMVar)
import Control.Monad.IO.Class (liftIO)
import qualified Data.ByteString.Lazy.Char8 as LBS8
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time.Calendar (toModifiedJulianDay)
import Data.Time.Clock (getCurrentTime, utctDay)
import Database.PostgreSQL.Simple (Connection, connectPostgreSQL)
import Network.Wai.Handler.Warp (run)
import Servant
import Servant.Server.StaticFiles (serveDirectoryFileServer)
import System.Environment (lookupEnv)
import System.IO (BufferMode (LineBuffering), hSetBuffering, stdout)
import Text.Read (readMaybe)

import Api
import Db
import Generator
import Models
import Rules

server :: MVar Connection -> Server ArcadeAPI
server connVar =
       healthH
  :<|> levelH
  :<|> validateH
  :<|> playerH
  :<|> wardrobeH
  :<|> progressH
  :<|> runsH
  :<|> leaderboardH
  :<|> serveDirectoryFileServer "static" -- "/" abre o index.html
  where
    healthH :: Handler Text
    healthH = pure "Lambda Arcade Servant + PostgreSQL OK"

    levelH :: GameKind -> Maybe Int -> Maybe Int -> Handler GeneratedLevel
    levelH game mSeed mTier = liftIO $ do
      today <- fromIntegral . toModifiedJulianDay . utctDay <$> getCurrentTime
      let seed = fromMaybe today mSeed
          tier = max 1 (fromMaybe 1 mTier)
      pure (generateLevel game seed tier)

    validateH :: GameKind -> ValidateReq -> Handler ValidateResp
    validateH game req =
      let safeReq = req { vTier = max 1 (vTier req) }
      in pure (validateSubmission game safeReq)

    playerH :: Text -> Handler PlayerProfile
    playerH uname = liftIO (getOrCreatePlayer connVar uname)

    wardrobeH :: Text -> WardrobeReq -> Handler PlayerProfile
    wardrobeH uname req = do
      _ <- liftIO (getOrCreatePlayer connVar uname)
      res <- liftIO (updateWardrobe connVar uname req)
      case res of
        Left err -> throwError err400 { errBody = LBS8.pack (T.unpack err) }
        Right p  -> pure p

    progressH :: Text -> ProgressReq -> Handler PlayerProfile
    progressH uname req = do
      _ <- liftIO (getOrCreatePlayer connVar uname)
      liftIO (saveProgress connVar uname req)

    runsH :: SubmitRunReq -> Handler PlayerProfile
    runsH req = do
      _ <- liftIO (getOrCreatePlayer connVar (srUsername req))
      liftIO (saveRun connVar req)

    leaderboardH :: GameKind -> Maybe Int -> Handler [LeaderboardEntry]
    leaderboardH game mSeed = liftIO (getLeaderboard connVar game mSeed)

main :: IO ()
main = do
  hSetBuffering stdout LineBuffering -- logs aparecem na hora no Render
  conn <- connectPostgreSQL =<< getDbUrl
  connVar <- newMVar conn
  -- Na nuvem (Render) a porta vem da variavel PORT; no PC continua 8080
  portStr <- lookupEnv "PORT"
  let port = fromMaybe 8080 (portStr >>= readMaybe)
  putStrLn ("Lambda Arcade rodando na porta " <> show port)
  run port (serve arcadeAPI (server connVar))