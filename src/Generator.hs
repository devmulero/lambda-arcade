{-# LANGUAGE OverloadedStrings #-}

module Generator (generateLevel) where

import Data.Aeson (Value (Null), object, (.=))
import Data.List (nub, sortBy)
import qualified Data.Map.Strict as Map
import Data.Ord (Down (..), comparing)
import qualified Data.Set as Set
import Data.Text (Text)
import qualified Data.Text as T
import Models
import System.Random (StdGen, mkStdGen, randomR, uniformR)

generateLevel :: GameKind -> Int -> Int -> GeneratedLevel
generateLevel game seed tier =
  let safeTier = max 1 tier
      g0 = mkStdGen (seed * 7919 + safeTier * 101)
      payload = case game of
        Runner    -> genRunner g0 seed safeTier
        Hexa      -> genHexa g0 seed safeTier
        Bastion   -> genBastion g0 seed safeTier
        LambdaMan -> genLambdaMan g0 seed safeTier
  in GeneratedLevel seed safeTier payload

pad2 :: Int -> Text
pad2 n
  | n < 10    = "0" <> T.pack (show n)
  | otherwise = T.pack (show n)

shuffleList :: StdGen -> [a] -> ([a], StdGen)
shuffleList g [] = ([], g)
shuffleList g xs =
  let (idx, g1) = randomR (0, length xs - 1) g
      picked = xs !! idx
      rest = take idx xs ++ drop (idx + 1) xs
      (restShuffled, g2) = shuffleList g1 rest
  in (picked : restShuffled, g2)

-- =========================================================================
-- 1. LAMBDA RUNNER: Antes infinitos procedurais com Bosses, cases e hint
-- =========================================================================
genRunner :: StdGen -> Int -> Int -> Value
genRunner g seed tier =
  let (obsAllShuffled, g1) = shuffleList g ["pedra", "galho", "calor"]
      (extraPick, _) = randomR (0 :: Int, 2) g1
      extraObs = ["pedra", "galho", "calor"] !! extraPick

      pool :: [Text]
      pool
        | tier == 1 = ["livre", "livre", "livre"]
        | tier == 2 = ["pedra", "galho", "livre", "pedra", "galho"]
        | tier `mod` 2 == 1 = ["livre", "combo"] ++ take 2 obsAllShuffled ++ [extraObs]
        | otherwise = ["livre"] ++ obsAllShuffled ++ [extraObs]

      target :: Int
      target =
        let baseExp = 180 * (2 ^ min 9 (tier - 1))
            extraLinear = max 0 (tier - 10) * 45000
        in baseExp + extraLinear

      bossRule :: Value
      bossRule
        | tier == 1 = Null
        | tier `mod` 2 == 0 =
            object
              [ "type" .= ("NO_IF" :: Text)
              , "label" .= ("Regra do Boss: proibido usar 'if' (Seed #" <> T.pack (show seed) <> ")")
              ]
        | otherwise =
            object
              [ "type" .= ("REQUIRE_HOF" :: Text)
              , "label" .= ("Bonus do Ante: use map, filter ou foldl (Seed #" <> T.pack (show seed) <> ")")
              ]

      mkCase :: Text -> Value
      mkCase "livre" = object ["obs" .= ("livre" :: Text), "sede" .= (80 :: Int), "expected" .= ("Correr" :: Text)]
      mkCase "pedra" = object ["obs" .= ("pedra" :: Text), "sede" .= (80 :: Int), "expected" .= ("Pular" :: Text)]
      mkCase "galho" = object ["obs" .= ("galho" :: Text), "sede" .= (80 :: Int), "expected" .= ("Abaixar" :: Text)]
      mkCase "calor" = object ["obs" .= ("calor" :: Text), "sede" .= (80 :: Int), "expected" .= ("BeberAgua" :: Text)]
      mkCase "combo" = object ["obs" .= ("combo" :: Text), "sede" .= (80 :: Int), "expected" .= ("Combo" :: Text)]
      mkCase other   = object ["obs" .= other, "sede" .= (80 :: Int), "expected" .= ("Correr" :: Text)]

      uniqueObs = nub pool
      casesList =
        map mkCase uniqueObs
          ++ [object ["obs" .= ("livre" :: Text), "sede" .= (25 :: Int), "expected" .= ("BeberAgua" :: Text)] | tier >= 3]

      (titleTxt, subTxt, starter, hintTxt) = runnerTexts
      runnerTexts :: (Text, Text, Text, Text)
      runnerTexts
        | tier == 1 =
            ( "Primeiros passos (Seed #" <> T.pack (show seed) <> ")"
            , "Defina <code>acao obs _ = Correr 10</code> para iniciar o Ante."
            , "-- Ante 1 (Seed #" <> T.pack (show seed) <> "): Funcoes Puras\nacao :: String -> Int -> Acao\nacao obs _ = Correr 10"
            , "Retorne <code>Correr 10</code> ou um numero maior para acelerar na pista."
            )
        | tier `mod` 2 == 0 =
            ( "Boss Purista: Sem 'if' (Ante " <> T.pack (show tier) <> ")"
            , "Desvie dos obstaculos da Seed #" <> T.pack (show seed) <> " usando apenas Guards <code>|</code>."
            , "-- Boss Seed #" <> T.pack (show seed) <> ": proibido usar 'if'! Complete os Guards\nacao :: String -> Int -> Acao\nacao \"calor\" _ = BeberAgua\nacao obs sede\n  | sede < 40      = BeberAgua\n  | obs == \"pedra\" = Pular\n  | otherwise      = Correr 11"
            , "Adicione os ramos que faltam sem usar <code>if</code>:<br><code>| obs == \"galho\" = Abaixar</code>"
            )
        | otherwise =
            ( "Corrida de Alta Ordem (Ante " <> T.pack (show tier) <> ")"
            , "Use <code>map</code> no ramo <code>\"combo\"</code> para gerar <code>Combo [...]</code>."
            , "-- Ante #" <> T.pack (show tier) <> " (Seed #" <> T.pack (show seed) <> "): ajuste \"combo\" para Combo (map reagir [\"pedra\", \"galho\"])\nreagir :: String -> Acao\nreagir x\n  | x == \"pedra\" = Pular\n  | x == \"galho\" = Abaixar\n  | otherwise    = Correr 13\n\nacao :: String -> Int -> Acao\nacao \"calor\" _ = BeberAgua\nacao obs sede\n  | sede < 35      = BeberAgua\n  | obs == \"combo\" = Correr 13\n  | otherwise      = reagir obs"
            , "No ramo de combo, substitua <code>Correr 13</code> por:<br><code>Combo (map reagir [\"pedra\", \"galho\"])</code>"
            )
  in object
      [ "num" .= pad2 tier
      , "name" .= ("Ante " <> T.pack (show tier) <> " · Seed #" <> T.pack (show seed))
      , "sig" .= ("String -> Int -> Acao" :: Text)
      , "eyebrow" .= ("MODO INFINITO · ANTE " <> T.pack (show tier))
      , "title" .= titleTxt
      , "sub" .= subTxt
      , "target" .= target
      , "starsReward" .= (45 + (tier - 1) * 30)
      , "bossRule" .= bossRule
      , "pool" .= pool
      , "cases" .= casesList
      , "starterCode" .= starter
      , "hint" .= hintTxt
      ]

-- =========================================================================
-- 2. HEXALAMBDA: Ilhas hexagonais procedurais certificadas (solucao unica)
-- =========================================================================
data HexConstraint = HexConstraint
  { hcIdxs :: [Int]
  , hcDir  :: Text
  , hcSide :: Text
  , hcPos  :: (Double, Double)
  }

genHexa :: StdGen -> Int -> Int -> Value
genHexa g0 seed tier = attemptLoop (0 :: Int) g0
  where
    desiredCells :: Int
    desiredCells
      | tier == 1 = 4
      | tier == 2 = 5
      | tier == 3 = 6
      | tier == 4 = 5
      | otherwise = 6 + (tier `mod` 2)

    desiredFixed :: Int
    desiredFixed
      | tier <= 3 = 1
      | tier == 4 = 0
      | tier `mod` 3 == 0 = 0
      | otherwise = 1

    attemptLoop :: Int -> StdGen -> Value
    attemptLoop tries g
      | tries >= 60 = genHexaFallback g seed tier
      | otherwise =
          let (cells, g1) = growPolyhex g desiredCells
              cons = extractNonCollidingCons cells
          in if length cons < 4
             then attemptLoop (tries + 1) g1
             else case tryAssignUnique g1 cells cons desiredFixed of
                    Just val -> val
                    Nothing  -> attemptLoop (tries + 1) g1

    growPolyhex :: StdGen -> Int -> ([(Int, Int)], StdGen)
    growPolyhex g targetN = go [(0, 0)] g
      where
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]
        go acc gen
          | length acc >= targetN = (reverse acc, gen)
          | otherwise =
              let frontier =
                    nub
                      [ (q + dq, r + dr)
                      | (q, r) <- acc
                      , (dq, dr) <- dirs
                      , let nq = q + dq
                      , let nr = r + dr
                      , not ((nq, nr) `elem` acc)
                      , abs nq <= 2 && abs nr <= 2
                      ]
              in if null frontier
                 then (reverse acc, gen)
                 else let (idx, gen') = randomR (0, length frontier - 1) gen
                      in go (frontier !! idx : acc) gen'

    to2D :: Double -> Double -> (Double, Double)
    to2D q r = (sqrt 3 * (q + r / 2.0), 1.5 * r)

    dist2D :: (Double, Double) -> (Double, Double) -> Double
    dist2D (x1, y1) (x2, y2) = sqrt ((x1 - x2) ^ (2 :: Int) + (y1 - y2) ^ (2 :: Int))

    extractNonCollidingCons :: [(Int, Int)] -> [HexConstraint]
    extractNonCollidingCons cells =
      let indexed = zip [0 :: Int ..] cells
          cellPts = [to2D (fromIntegral q) (fromIntegral r) | (q, r) <- cells]

          splitRuns :: [(Int, Int)] -> [[Int]]
          splitRuns [] = []
          splitRuns (x:xs) = go [x] xs
            where
              go cur [] = [map snd (reverse cur) | length cur >= 2]
              go cur@(p:_) (y:ys)
                | fst y == fst p + 1 = go (y : cur) ys
                | otherwise          = [map snd (reverse cur) | length cur >= 2] ++ go [y] ys

          groupRuns :: Text -> (Int, Int) -> ((Int, Int) -> Int) -> ((Int, Int) -> Int) -> [HexConstraint]
          groupRuns dirName (dq, dr) keyFn sortFn =
            let grouped = Map.fromListWith (++) [(keyFn crd, [(sortFn crd, idx)]) | (idx, crd) <- indexed]
                runs = concatMap (splitRuns . sortBy (comparing fst)) (Map.elems grouped)
                mkCandidate runIdxs sideName =
                  let (aq, ar) = cells !! (if sideName == "end" then last runIdxs else head runIdxs)
                      sgn = if sideName == "end" then 1.0 else -1.0
                      mq = fromIntegral aq + fromIntegral dq * sgn * 1.15
                      mr = fromIntegral ar + fromIntegral dr * sgn * 1.15
                  in HexConstraint runIdxs dirName sideName (to2D mq mr)
            in concatMap (\r -> [mkCandidate r "end", mkCandidate r "start"]) runs

          allCandidates =
               groupRuns "row"   (1, 0)  snd fst
            ++ groupRuns "diagR" (0, 1)  fst snd
            ++ groupRuns "diagL" (-1, 1) (\(q, r) -> q + r) snd

          safeFromCells c = all (\pt -> dist2D (hcPos c) pt >= 0.96) cellPts

          pickNonColliding [] acc = reverse acc
          pickNonColliding (c:cs) acc
            | safeFromCells c && all (\o -> dist2D (hcPos c) (hcPos o) >= 0.88) acc =
                pickNonColliding cs (c : acc)
            | otherwise = pickNonColliding cs acc
      in pickNonColliding allCandidates []

    tryAssignUnique :: StdGen -> [(Int, Int)] -> [HexConstraint] -> Int -> Maybe Value
    tryAssignUnique g0' cells cons fixedN =
      let n = length cells
          (perm, g1) = shuffleList g0' [0 .. n - 1]
          fixedSet = Set.fromList (take fixedN perm)
          varIdxs = [i | i <- [0 .. n - 1], not (Set.member i fixedSet)]
          varNamesAll = ["a", "b", "c", "d", "e", "f"]
          varNames = zipWith (\idx nm -> (idx, nm)) varIdxs varNamesAll
          varNameMap = Map.fromList varNames

          tryValues :: Int -> StdGen -> Maybe Value
          tryValues 24 _ = Nothing
          tryValues k gen =
            let drawVals 0 gn acc = (reverse acc, gn)
                drawVals m gn acc = let (v, gn') = uniformR (1 :: Int, 3) gn in drawVals (m - 1) gn' (v : acc)
                (vals, genNext) = drawVals n gen []
                fixedMap = Map.fromList [(i, vals !! i) | i <- Set.toList fixedSet]
                conTargets = [(hcIdxs c, sum [vals !! i | i <- hcIdxs c]) | c <- cons]

                countUpTo2 :: Int -> Map.Map Int Int -> [()]
                countUpTo2 vi assigned
                  | vi == length varIdxs = [()]
                  | otherwise =
                      let cIdx = varIdxs !! vi
                      in concat
                           [ countUpTo2 (vi + 1) m'
                           | v <- [1 .. 3]
                           , let m' = Map.insert cIdx v assigned
                           , all (\(cIds, tgt) ->
                                   let known = [val | id' <- cIds, Just val <- [Map.lookup id' m']]
                                       remC = length cIds - length known
                                       s = sum known
                                   in s + remC <= tgt && s + 3 * remC >= tgt
                                 ) conTargets
                           ]
            in if length (take 2 (countUpTo2 0 fixedMap)) == 1
               then
                 let cellId i = case Map.lookup i varNameMap of
                       Just nm -> nm
                       Nothing -> "f" <> T.pack (show i)
                     cellObjs =
                       [ let (q, r) = cells !! i
                         in case Map.lookup i varNameMap of
                              Just nm -> object ["id" .= nm, "q" .= q, "r" .= r, "fixed" .= False, "val" .= (0 :: Int), "label" .= nm]
                              Nothing -> object ["id" .= cellId i, "q" .= q, "r" .= r, "fixed" .= True, "val" .= (vals !! i)]
                       | i <- [0 .. n - 1]
                       ]
                     conObjs =
                       [ object
                           [ "ids" .= map cellId (hcIdxs c)
                           , "target" .= tgt
                           , "dir" .= hcDir c
                           , "side" .= hcSide c
                           ]
                       | (c, (_, tgt)) <- zip cons conTargets
                       ]
                     exprFor c tgt =
                       let terms =
                             [ case Map.lookup i varNameMap of
                                 Just nm -> nm
                                 Nothing -> T.pack (show (vals !! i))
                             | i <- hcIdxs c
                             ]
                       in T.intercalate " + " terms <> " == " <> T.pack (show tgt)
                     allExprs = [exprFor c tgt | (c, (_, tgt)) <- zip cons conTargets]
                     varList = map snd varNames
                     tupleTxt = "(" <> T.intercalate ", " varList <> ")"
                     genTxt = T.intercalate ", " [nm <> " <- [1..3]" | nm <- varList]
                     firstCond = if null allExprs then "True" else head allExprs
                     restConds = T.intercalate ", " (drop 1 allExprs)
                     starter =
                       "-- Seed #" <> T.pack (show seed) <> " (" <> T.pack (show n) <> " pecas · 1 solucao unica)\nsolucao = [ "
                       <> tupleTxt <> "\n  | " <> genTxt <> "\n  , " <> firstCond <> "\n  ]"
                     hintStr =
                       if T.null restConds
                       then "Todas as restricoes ja estao na compreensao!"
                       else "Adicione antes do <code>]</code>:<br><code>, " <> restConds <> "</code>"
                     sigStr = "[Int] -> [(" <> T.intercalate ", " (replicate (length varList) "Int") <> ")]"
                 in Just $ object
                      [ "num" .= pad2 tier
                      , "name" .= ("Ilha " <> T.pack (show n) <> "P · Seed #" <> T.pack (show seed))
                      , "sig" .= sigStr
                      , "eyebrow" .= ("HEXALAMBDA · ANTE " <> T.pack (show tier) <> " · SEED #" <> T.pack (show seed))
                      , "title" .= ("Tabuleiro Procedural (" <> T.pack (show n) <> " Pecas)")
                      , "sub" .= ("Deduza os valores de 1 a 3 traduzindo os medalhoes para a List Comprehension." :: Text)
                      , "baseChips" .= (65 + (tier - 1) * 30)
                      , "vars" .= varList
                      , "cells" .= cellObjs
                      , "constraints" .= conObjs
                      , "starterCode" .= starter
                      , "hint" .= hintStr
                      ]
               else tryValues (k + 1) genNext
      in tryValues 0 g1

genHexaFallback :: StdGen -> Int -> Int -> Value
genHexaFallback g0 seed tier = findUnique g0
  where
    findUnique g =
      let (f0, g1) = uniformR (1 :: Int, 3) g
          (a,  g2) = uniformR (1 :: Int, 3) g1
          (b,  g3) = uniformR (1 :: Int, 3) g2
          (c,  g4) = uniformR (1 :: Int, 3) g3
          sR1 = f0 + a
          sR2 = b + c
          sC1 = f0 + b
          sC2 = a + c
          sD1 = a + b
          sols =
            [ (va, vb, vc)
            | va <- [1..3], f0 + va == sR1
            , vb <- [1..3], f0 + vb == sC1, va + vb == sD1
            , vc <- [1..3], vb + vc == sR2, va + vc == sC2
            ]
      in if length sols == 1
         then object
           [ "num" .= pad2 tier
           , "name" .= ("Santuario 4P · Seed #" <> T.pack (show seed))
           , "sig" .= ("[Int] -> [(Int, Int, Int)]" :: Text)
           , "eyebrow" .= ("HEXALAMBDA · ANTE " <> T.pack (show tier) <> " · SEED #" <> T.pack (show seed))
           , "title" .= ("Tabuleiro Procedural (4 Pecas)" :: Text)
           , "sub" .= ("Adicione as somas faltantes na List Comprehension." :: Text)
           , "baseChips" .= (65 + (tier - 1) * 25)
           , "vars" .= (["a", "b", "c"] :: [Text])
           , "cells" .=
               [ object ["id" .= ("f0" :: Text), "q" .= (0::Int), "r" .= (0::Int), "fixed" .= True,  "val" .= f0]
               , object ["id" .= ("a"  :: Text), "q" .= (1::Int), "r" .= (0::Int), "fixed" .= False, "val" .= (0::Int), "label" .= ("a" :: Text)]
               , object ["id" .= ("b"  :: Text), "q" .= (0::Int), "r" .= (1::Int), "fixed" .= False, "val" .= (0::Int), "label" .= ("b" :: Text)]
               , object ["id" .= ("c"  :: Text), "q" .= (1::Int), "r" .= (1::Int), "fixed" .= False, "val" .= (0::Int), "label" .= ("c" :: Text)]
               ]
           , "constraints" .=
               [ object ["ids" .= (["f0", "a"] :: [Text]), "target" .= sR1, "dir" .= ("row"   :: Text), "side" .= ("end" :: Text)]
               , object ["ids" .= (["b",  "c"] :: [Text]), "target" .= sR2, "dir" .= ("row"   :: Text), "side" .= ("end" :: Text)]
               , object ["ids" .= (["f0", "b"] :: [Text]), "target" .= sC1, "dir" .= ("diagR" :: Text), "side" .= ("end" :: Text)]
               , object ["ids" .= (["a",  "c"] :: [Text]), "target" .= sC2, "dir" .= ("diagR" :: Text), "side" .= ("end" :: Text)]
               , object ["ids" .= (["a",  "b"] :: [Text]), "target" .= sD1, "dir" .= ("diagL" :: Text), "side" .= ("end" :: Text)]
               ]
           , "starterCode" .=
               ("-- Seed #" <> T.pack (show seed) <> " certificada\nsolucao = [ (a, b, c)\n  | a <- [1..3], b <- [1..3], c <- [1..3]\n  , "
               <> T.pack (show f0) <> " + a == " <> T.pack (show sR1) <> "\n  ]")
           , "hint" .=
               ("Adicione:<br><code>, "
               <> T.pack (show f0) <> " + b == " <> T.pack (show sC1)
               <> ", b + c == " <> T.pack (show sR2)
               <> ", a + c == " <> T.pack (show sC2) <> "</code>")
           ]
         else findUnique g4

-- =========================================================================
-- 3. BASTION GUARD: Mapa, Estrada, Pedestais e Ondas Procedurais por Seed
-- =========================================================================
genBastion :: StdGen -> Int -> Int -> Value
genBastion g seed tier =
  let modeIdx = (tier - 1) `mod` 3
      modeName :: Text
      modeName
        | modeIdx == 0 = "TARGETS"
        | modeIdx == 1 = "DAMAGE"
        | otherwise    = "FOLD"

      -- 1) Estrada procedural com 7 pontos de controle normalizados
      pathXs :: [Double]
      pathXs = [0.04, 0.19, 0.34, 0.49, 0.64, 0.78, 0.90]

      buildYs :: [Double] -> StdGen -> ([Double], StdGen)
      buildYs [] gen = ([], gen)
      buildYs (_:xs) gen =
        let (y, gen') = uniformR (0.19 :: Double, 0.81 :: Double) gen
            (rest, gen'') = buildYs xs gen'
        in (y : rest, gen'')

      (pathYs, g1) = buildYs pathXs g
      pathPts = zip pathXs pathYs

      interpRoadY :: Double -> Double
      interpRoadY x = go pathPts
        where
          go [] = 0.5
          go [(_, y)] = y
          go ((x0, y0) : p1@(x1, y1) : ps)
            | x <= x1   = let u = (x - x0) / max 0.001 (x1 - x0) in y0 + (y1 - y0) * max 0 (min 1 u)
            | otherwise = go (p1 : ps)

      roadSamples = [(x, interpRoadY x) | x <- [0.04, 0.08 .. 0.90]]
      distToRoad (px, py) = minimum [sqrt ((px - rx) ^ (2 :: Int) + (py - ry) ^ (2 :: Int)) | (rx, ry) <- roadSamples]

      -- 2) Pedestais procedurais (5 a 6) fora da estrada
      padXs :: [Double]
      padXs = if tier <= 2 then [0.16, 0.32, 0.48, 0.64, 0.79] else [0.14, 0.28, 0.42, 0.56, 0.70, 0.82]

      buildPads :: [Double] -> StdGen -> ([(Double, Double)], StdGen)
      buildPads [] gen = ([], gen)
      buildPads (px:pxs) gen =
        let ry = interpRoadY px
            (flipSide, gen') = randomR (0 :: Int, 1) gen
            s1 = if flipSide == 0 then -1.0 else 1.0
            cand1 = max 0.12 (min 0.88 (ry + s1 * 0.24))
            cand2 = max 0.12 (min 0.88 (ry - s1 * 0.24))
            py = if distToRoad (px, cand1) >= distToRoad (px, cand2) then cand1 else cand2
            (rest, gen'') = buildPads pxs gen'
        in ((px, py) : rest, gen'')

      (padCoords, g2) = buildPads padXs g1
      padObjs =
        [ object ["nx" .= px, "ny" .= py, "hasStarter" .= (idx == 0)]
        | (idx, (px, py)) <- zip [0 :: Int ..] padCoords
        ]

      -- 3) Arvores decorativas procedurais fora da estrada e dos pedestais
      genTrees :: Int -> StdGen -> [(Double, Double, Double)] -> ([(Double, Double, Double)], StdGen)
      genTrees 0 gen acc = (acc, gen)
      genTrees k gen acc =
        let (tx, gA) = uniformR (0.06 :: Double, 0.88) gen
            (ty, gB) = uniformR (0.08 :: Double, 0.92) gA
            (ts, gC) = uniformR (0.80 :: Double, 1.12) gB
            okRoad = distToRoad (tx, ty) >= 0.13
            okPads = all (\(px, py) -> sqrt ((tx - px) ^ (2 :: Int) + (ty - py) ^ (2 :: Int)) >= 0.11) padCoords
        in if okRoad && okPads
           then genTrees (k - 1) gC ((tx, ty, ts) : acc)
           else genTrees (k - 1) gC acc

      (treeList, g3) = genTrees 14 g2 []
      treeObjs = [object ["nx" .= tx, "ny" .= ty, "s" .= ts] | (tx, ty, ts) <- treeList]

      -- 4) Onda de inimigos procedural
      count = 5 + min 9 tier

      mkEnemy :: Int -> StdGen -> (Value, StdGen)
      mkEnemy idx gen =
        let (r, gen') = randomR (0 :: Int, 9) gen
            (tName, hp, sh, spd)
              | modeName == "FOLD" && idx == count - 1 =
                  ("boss" :: Text, 460 + tier * 75, 0 :: Int, 0.042 :: Double)
              | modeName == "TARGETS" && idx `elem` [0, 3] =
                  ("golem", 150 + tier * 18, 1, 0.055)
              | r < 3 =
                  ("golem", 145 + tier * 16, 1, 0.055)
              | r < 6 =
                  ("wisp", 55 + tier * 8, 0, 0.118)
              | otherwise =
                  ("slime", 64 + tier * 10, 0, 0.095)
        in (object ["type" .= tName, "hp" .= hp, "shield" .= sh, "speed" .= spd], gen')

      buildWave 0 _   acc = reverse acc
      buildWave n gen acc =
        let (e, gen') = mkEnemy (count - n) gen
        in buildWave (n - 1) gen' (e : acc)

      wave = buildWave count g3 []

      (titleTxt, subTxt, sigTxt, starter, hintTxt) = bastionTexts
      bastionTexts :: (Text, Text, Text, Text, Text)
      bastionTexts = case modeName of
        "TARGETS" ->
          ( "Quebra-Escudo (Seed #" <> T.pack (show seed) <> ")"
          , "Os Golems bloqueiam disparos! Use <code>filter</code> para mirar em quem tem <code>escudo e == 0</code>."
          , "[Inimigo] -> [Inimigo]"
          , "-- Seed #" <> T.pack (show seed) <> ": Golems tem escudo == 1! Filtre quem tem escudo == 0\nalvos :: [Inimigo] -> [Inimigo]\nalvos inimigos = inimigos"
          , "Substitua a ultima linha por:<br><code>alvos inimigos = filter (\\e -> escudo e == 0) inimigos</code>"
          )
        "DAMAGE" ->
          ( "Pipeline Arcano (Seed #" <> T.pack (show seed) <> ")"
          , "Encadeie <code>map (receberDano 55) . filter (...)</code> em estilo Point-Free."
          , "[Inimigo] -> [Inimigo]"
          , "-- Seed #" <> T.pack (show seed) <> ": Componha filter e map com (.) sem citar variaveis\natacar :: [Inimigo] -> [Inimigo]\natacar = map (receberDano 25)"
          , "Escreva:<br><code>atacar = map (receberDano 55) . filter (\\e -> escudo e == 0)</code>"
          )
        _ ->
          ( "Cerco ao Tita (Seed #" <> T.pack (show seed) <> ")"
          , "Funda o poder das torres com <code>foldl (+) 0 torres</code> para derrubar o Boss."
          , "[Int] -> Int"
          , "-- Seed #" <> T.pack (show seed) <> ": Some o poder da lista torres usando foldl (+) 0 torres\npoderTotal :: [Int] -> Int\npoderTotal torres = 20"
          , "Troque <code>20</code> por <code>foldl (+) 0 torres</code> e erga varias torres nos circulos (+)."
          )
  in object
      [ "num" .= pad2 tier
      , "name" .= ("Onda " <> T.pack (show tier) <> " · Seed #" <> T.pack (show seed))
      , "sig" .= sigTxt
      , "eyebrow" .= ("BASTION · " <> modeName <> " · ANTE " <> T.pack (show tier))
      , "title" .= titleTxt
      , "sub" .= subTxt
      , "mode" .= modeName
      , "startGold" .= (95 + min 130 ((tier - 1) * 18))
      , "starsReward" .= (70 + (tier - 1) * 30)
      , "path" .= [object ["nx" .= px, "ny" .= py] | (px, py) <- pathPts]
      , "pads" .= padObjs
      , "trees" .= treeObjs
      , "wave" .= wave
      , "starterCode" .= starter
      , "hint" .= hintTxt
      ]

-- =========================================================================
-- 4. LAMBDA-MAN: Labirintos procedurais ricos (DFS + Loops moderados + BFS)
-- =========================================================================
genLambdaMan :: StdGen -> Int -> Int -> Value
genLambdaMan g0 seed tier =
  let (cols, rows)
        | tier == 1 = (11, 7)
        | tier == 2 = (13, 7)
        | tier <= 4 = (13, 9)
        | otherwise = (15, 9)
      cw = (cols - 1) `div` 2
      ch = (rows - 1) `div` 2

      dfs :: (Int, Int) -> Set.Set (Int, Int) -> Set.Set (Int, Int) -> StdGen -> (Set.Set (Int, Int), Set.Set (Int, Int), StdGen)
      dfs (cx, cy) vis openG gen =
        let gx = 1 + 2 * cx
            gy = 1 + 2 * cy
            vis1 = Set.insert (cx, cy) vis
            open1 = Set.insert (gx, gy) openG
            (dirs, gen1) = shuffleList gen [(1, 0), (-1, 0), (0, 1), (0, -1)]
            step (v, o, gc) (dx, dy) =
              let nx = cx + dx
                  ny = cy + dy
              in if nx >= 0 && nx < cw && ny >= 0 && ny < ch && not (Set.member (nx, ny) v)
                 then let wx = 1 + cx + nx
                          wy = 1 + cy + ny
                      in dfs (nx, ny) v (Set.insert (wx, wy) o) gc
                 else (v, o, gc)
        in foldl step (vis1, open1, gen1) dirs

      (_, treeOpen, g1) = dfs (0, 0) Set.empty Set.empty g0

      -- Remove becos sem saida preservando paredes internas reais
      allLogical = [(cx, cy) | cx <- [0 .. cw - 1], cy <- [0 .. ch - 1]]
      (shuffledLogical, g1b) = shuffleList g1 allLogical

      carveDeadEnds :: Set.Set (Int, Int) -> StdGen -> (Set.Set (Int, Int), StdGen)
      carveDeadEnds openStart gen = foldl step (openStart, gen) shuffledLogical
        where
          step (o, gc) (cx, cy) =
            let gx = 1 + 2 * cx
                gy = 1 + 2 * cy
                ortho = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                deg = length [() | (dx, dy) <- ortho, Set.member (gx + dx, gy + dy) o]
                candidates =
                  [ (gx + dx, gy + dy)
                  | (dx, dy) <- ortho
                  , let wx = gx + dx
                  , let wy = gy + dy
                  , let nx = gx + 2 * dx
                  , let ny = gy + 2 * dy
                  , nx >= 1 && nx <= cols - 2 && ny >= 1 && ny <= rows - 2
                  , not (Set.member (wx, wy) o)
                  ]
            in if deg <= 1 && not (null candidates)
               then let (idx, gc') = randomR (0, length candidates - 1) gc
                    in (Set.insert (candidates !! idx) o, gc')
               else (o, gc)

      (braidedOpen, g2) = carveDeadEnds treeOpen g1b

      -- Abre apenas 1 loop extra para manter corredores bem definidos
      interiorWalls =
        [ (x, y)
        | y <- [1 .. rows - 2]
        , x <- [1 .. cols - 2]
        , odd x /= odd y
        , not (Set.member (x, y) braidedOpen)
        ]
      (shuffledWalls, g3) = shuffleList g2 interiorWalls
      finalOpen = foldl (flip Set.insert) braidedOpen (take 1 shuffledWalls)

      bfsDist :: Set.Set (Int, Int) -> (Int, Int) -> Map.Map (Int, Int) Int
      bfsDist openCells start = go [(start, 0)] (Map.singleton start 0)
        where
          go [] dMap = dMap
          go (((px, py), d) : q) dMap =
            let nbrs =
                  [ (px + dx, py + dy)
                  | (dx, dy) <- [(1, 0), (-1, 0), (0, 1), (0, -1)]
                  , Set.member (px + dx, py + dy) openCells
                  , not (Map.member (px + dx, py + dy) dMap)
                  ]
                dMap' = foldl (\m p -> Map.insert p (d + 1) m) dMap nbrs
                q' = q ++ [(p, d + 1) | p <- nbrs]
            in go q' dMap'

      distMap = bfsDist finalOpen (1, 1)
      reachableSet = Map.keysSet distMap

      ghostCount
        | tier == 1 = 0
        | tier == 2 = 1
        | tier <= 4 = 2
        | otherwise = 3

      farCells =
        map fst
          $ sortBy (comparing (Down . snd))
          $ filter (\(pos, d) -> pos /= (1, 1) && d >= 5) (Map.toList distMap)

      pickSpaced :: Int -> [(Int, Int)] -> [(Int, Int)]
      pickSpaced 0 _ = []
      pickSpaced _ [] = []
      pickSpaced k (p@(px, py) : ps) =
        let chosenRest = pickSpaced (k - 1) (filter (\(qx, qy) -> abs (px - qx) + abs (py - qy) >= 3) ps)
        in p : chosenRest

      ghostPositions = Set.fromList (pickSpaced ghostCount farCells)

      midCells =
        [ pos
        | (pos, d) <- Map.toList distMap
        , pos /= (1, 1)
        , not (Set.member pos ghostPositions)
        , d >= 3
        ]
      (shuffledMid, _) = shuffleList g3 midCells
      runeCount = if ghostCount > 0 then min 2 ghostCount else 0
      runePositions = Set.fromList (take runeCount shuffledMid)

      cellChar :: Int -> Int -> Char
      cellChar x y
        | (x, y) == (1, 1)                = 'P'
        | Set.member (x, y) ghostPositions = 'G'
        | Set.member (x, y) runePositions  = '*'
        | Set.member (x, y) reachableSet   = '.'
        | otherwise                        = '#'

      mazeRows :: [Text]
      mazeRows = [T.pack [cellChar x y | x <- [0 .. cols - 1]] | y <- [0 .. rows - 1]]

      (titleTxt, subTxt, sigTxt, starter, hintTxt) = lmTexts
      lmTexts :: (Text, Text, Text, Text, Text)
      lmTexts
        | tier == 1 =
            ( "Passo Seguro (Seed #" <> T.pack (show seed) <> ")"
            , "Complete as direcoes retornando <code>Just</code> para percorrer todo o labirinto."
            , "Maybe Direcao"
            , "-- Seed #" <> T.pack (show seed) <> ": Adicione Oeste e Norte antes do otherwise\nproximoPasso :: Maybe Direcao\nproximoPasso\n  | livre Leste && naoVolta Leste = Just Leste\n  | livre Sul   && naoVolta Sul   = Just Sul\n  | otherwise                     = Nothing"
            , "Adicione antes de <code>otherwise</code>:<br><code>| livre Oeste && naoVolta Oeste = Just Oeste</code><br><code>| livre Norte && naoVolta Norte = Just Norte</code>"
            )
        | tier == 2 =
            ( "Recursao com Maybe (Seed #" <> T.pack (show seed) <> ")"
            , "Trate o caso <code>Nothing</code> chamando <code>buscarLivre</code> para continuar explorando."
            , "[Direcao] -> Maybe Direcao"
            , "-- Seed #" <> T.pack (show seed) <> ": Trate o caso Nothing no case ... of\nbuscarOrbe []     = Nothing\nbuscarOrbe (d:ds) = if livre d && temOrbe d then Just d else buscarOrbe ds\n\nbuscarLivre []     = Nothing\nbuscarLivre (d:ds) = if livre d && naoVolta d then Just d else buscarLivre ds\n\nproximoPasso :: Maybe Direcao\nproximoPasso = case buscarOrbe [Norte, Leste, Sul, Oeste] of\n  Just d  -> Just d\n  Nothing -> Nothing"
            , "Substitua o ultimo <code>Nothing</code> por:<br><code>Nothing -> buscarLivre [Norte, Leste, Sul, Oeste]</code>"
            )
        | otherwise =
            ( "Fuga das Sentinelas (Ante " <> T.pack (show tier) <> ")"
            , "Filtre direcoes seguras com <code>not (perigo d)</code> e use <code>alvoSeguro</code> como fallback."
            , "[Direcao] -> Maybe Direcao"
            , "-- Seed #" <> T.pack (show seed) <> ": Faltou filtrar && not (perigo d)!\nseguras = filter (\\d -> livre d) [Norte, Leste, Sul, Oeste]\n\nbuscarOrbe []     = Nothing\nbuscarOrbe (d:ds) = if temOrbe d then Just d else buscarOrbe ds\n\nproximoPasso :: Maybe Direcao\nproximoPasso = case buscarOrbe seguras of\n  Just d  -> Just d\n  Nothing -> Nothing"
            , "Atualize para:<br><code>seguras = filter (\\d -> livre d && not (perigo d)) [Norte, Leste, Sul, Oeste]</code><br>e no <code>Nothing -> alvoSeguro</code>."
            )
  in object
      [ "num" .= pad2 tier
      , "name" .= ("Templo " <> T.pack (show tier) <> " · Seed #" <> T.pack (show seed))
      , "sig" .= sigTxt
      , "eyebrow" .= ("LAMBDA-MAN · ANTE " <> T.pack (show tier) <> " · SEED #" <> T.pack (show seed))
      , "title" .= titleTxt
      , "sub" .= subTxt
      , "baseChips" .= (70 + (tier - 1) * 40)
      , "map" .= mazeRows
      , "starterCode" .= starter
      , "hint" .= hintTxt
      ]