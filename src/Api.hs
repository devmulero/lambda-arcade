{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}

module Api where

import Data.Text (Text)
import Models
import Servant

type ArcadeAPI =
       "api" :> "health" :> Get '[JSON] Text
  :<|> "api" :> "levels" :> Capture "game" GameKind
             :> QueryParam "seed" Int :> QueryParam "tier" Int :> Get '[JSON] GeneratedLevel
  :<|> "api" :> "validate" :> Capture "game" GameKind
             :> ReqBody '[JSON] ValidateReq :> Post '[JSON] ValidateResp
  :<|> "api" :> "player" :> Capture "username" Text :> Get '[JSON] PlayerProfile
  :<|> "api" :> "player" :> Capture "username" Text :> "wardrobe"
             :> ReqBody '[JSON] WardrobeReq :> Post '[JSON] PlayerProfile
  :<|> "api" :> "player" :> Capture "username" Text :> "progress"
             :> ReqBody '[JSON] ProgressReq :> Post '[JSON] PlayerProfile
  :<|> "api" :> "runs" :> ReqBody '[JSON] SubmitRunReq :> Post '[JSON] PlayerProfile
  :<|> "api" :> "leaderboard" :> Capture "game" GameKind
             :> QueryParam "seed" Int :> Get '[JSON] [LeaderboardEntry]
  :<|> Raw

arcadeAPI :: Proxy ArcadeAPI
arcadeAPI = Proxy