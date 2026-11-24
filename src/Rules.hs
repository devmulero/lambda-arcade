{-# LANGUAGE OverloadedStrings #-}

module Rules (validateSubmission) where

import qualified Data.Text as T
import Models

validateSubmission :: GameKind -> ValidateReq -> ValidateResp
validateSubmission game req =
  let code = vCode req
      codeNoComments = T.unlines (map (fst . T.breakOn "--") (T.lines code))
      tier = max 1 (vTier req)
      has kw = kw `T.isInfixOf` codeNoComments
      usesIf = has "if " || has "if\n" || has "(if "
      mult = 1.0
           + (if has "filter" || has "map" then 0.5 else 0)
           + (if has "foldl" || has "foldr" then 1.0 else 0)
           + (if has "Just" || has "Nothing" then 0.5 else 0)
           + (if has " . " || has " $ " then 0.5 else 0)
  in if T.null (T.strip codeNoComments)
     then ValidateResp False "O editor nao pode estar vazio." 1.0
     else case game of
       Runner
         | tier >= 2 && tier `mod` 2 == 0 && usesIf ->
             ValidateResp False "Regra do Boss: proibido usar 'if' neste Ante! Use Guards (|)." 1.0
         | otherwise ->
             ValidateResp True "Codigo validado pelo servidor Servant." mult

       Hexa
         | not (has "<-") ->
             ValidateResp False "Use uma List Comprehension com gerador (<-)." 1.0
         | otherwise ->
             ValidateResp True "List Comprehension valida." mult

       Bastion
         | (tier - 1) `mod` 3 == 2 && not (has "foldl" || has "foldr") ->
             ValidateResp False "Modo FOLD: use foldl ou foldr para somar o poder das torres!" 1.0
         | otherwise ->
             ValidateResp True "Pipeline funcional validado." mult

       LambdaMan
         | not (has "Just" || has "Nothing") ->
             ValidateResp False "Sua funcao deve trabalhar com Maybe (Just / Nothing)." 1.0
         | otherwise ->
             ValidateResp True "Navegacao Maybe validada." mult