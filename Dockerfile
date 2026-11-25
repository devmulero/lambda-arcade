# ============================================================
# Estágio 1 — COMPILAR (roda no GitHub Actions, que tem RAM de sobra)
# Mesma versão de GHC que a dupla usou no Windows (9.10.3)
# ============================================================
FROM haskell:9.10.3-bookworm AS build

# libpq-dev: cabeçalhos do PostgreSQL, exigidos pelo postgresql-simple
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq-dev pkg-config zlib1g-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN cabal update

# 1) Só o .cabal primeiro: as dependências (servant, aeson, warp...) ficam
#    numa camada própria e não recompilam quando só o código muda.
COPY lambda-arcade.cabal ./
RUN mkdir -p src && cabal build --only-dependencies -j

# 2) Agora o código Haskell de verdade
COPY src ./src
RUN cabal install exe:lambda-arcade \
      --installdir=/out --install-method=copy --overwrite-policy=always

# ============================================================
# Estágio 2 — RODAR (imagem pequena: só o binário + o front)
# ============================================================
FROM debian:bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 libgmp10 libffi8 zlib1g ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /out/lambda-arcade /usr/local/bin/lambda-arcade
# O Main.hs serve os arquivos com serveDirectoryWebApp "static" (caminho relativo)
COPY static ./static
COPY schema.sql ./

# O binário foi compilado com -N (usa todos os núcleos). No plano grátis do
# Render a CPU é minúscula, então limitamos a 2 threads do runtime.
ENV GHCRTS=-N2
ENV PORT=8080
EXPOSE 8080

CMD ["lambda-arcade"]
