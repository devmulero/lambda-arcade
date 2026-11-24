{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Models where

import Data.Aeson (FromJSON, ToJSON, Value)
import Data.Text (Text)
import GHC.Generics (Generic)
import Servant (FromHttpApiData (..))

data GameKind = Runner | Hexa | Bastion | LambdaMan
  deriving (Eq, Show, Generic)

instance FromHttpApiData GameKind where
  parseUrlPiece "runner"    = Right Runner
  parseUrlPiece "hexa"      = Right Hexa
  parseUrlPiece "bastion"   = Right Bastion
  parseUrlPiece "lambdaman" = Right LambdaMan
  parseUrlPiece other       = Left ("Jogo desconhecido: " <> other)

gameToText :: GameKind -> Text
gameToText Runner    = "runner"
gameToText Hexa      = "hexa"
gameToText Bastion   = "bastion"
gameToText LambdaMan = "lambdaman"

data PlayerProfile = PlayerProfile
  { pUsername             :: Text
  , pStars                :: Int
  , pBestScore            :: Int
  , pBestAnte             :: Int
  , pRunsCompleted        :: Int
  , pEquippedSkin         :: Text
  , pEquippedAcc          :: Text
  , pEquippedTheme        :: Text
  , pEquippedTrail        :: Text
  , pEquippedPet          :: Text
  , pUnlockedItems        :: [Text]
  , pUnlockedAchievements :: [Text]
  , pCardsStudied         :: [Text]
  } deriving (Show, Generic)

instance ToJSON PlayerProfile

data WardrobeReq = WardrobeReq
  { wCategory :: Text -- "skin" | "acc" | "theme" | "trail" | "pet"
  , wItemId   :: Text
  , wPrice    :: Int
  } deriving (Show, Generic)

instance FromJSON WardrobeReq

data ProgressReq = ProgressReq
  { prCategory :: Text -- "card" | "achievement"
  , prKey      :: Text
  , prReward   :: Int
  } deriving (Show, Generic)

instance FromJSON ProgressReq

data ValidateReq = ValidateReq
  { vCode :: Text
  , vTier :: Int
  } deriving (Show, Generic)

instance FromJSON ValidateReq

data ValidateResp = ValidateResp
  { vrValid   :: Bool
  , vrMessage :: Text
  , vrHofMult :: Double
  } deriving (Show, Generic)

instance ToJSON ValidateResp

data SubmitRunReq = SubmitRunReq
  { srUsername :: Text
  , srGame     :: Text
  , srSeed     :: Int
  , srTier     :: Int
  , srScore    :: Int
  , srStarsWon :: Int
  , srHofMult  :: Double
  , srCode     :: Text
  } deriving (Show, Generic)

instance FromJSON SubmitRunReq

data LeaderboardEntry = LeaderboardEntry
  { leUsername :: Text
  , leScore    :: Int
  , leHofMult  :: Double
  , leTier     :: Int
  } deriving (Show, Generic)

instance ToJSON LeaderboardEntry

data GeneratedLevel = GeneratedLevel
  { glSeed    :: Int
  , glTier    :: Int
  , glPayload :: Value
  } deriving (Show, Generic)

instance ToJSON GeneratedLevel