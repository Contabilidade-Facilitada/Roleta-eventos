-- Giros enviados pelos aparelhos da roleta. O id é gerado no aparelho, o que
-- permite reenviar o mesmo giro sem duplicar. seq serve para o painel buscar só o que é novo.
CREATE TABLE giros (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  id          TEXT    NOT NULL UNIQUE,
  momento     INTEGER NOT NULL,           -- milissegundos desde 1970, horário do aparelho
  premio      TEXT    NOT NULL,
  ganhou      INTEGER NOT NULL,
  evento      TEXT    NOT NULL DEFAULT '',
  aparelho    TEXT    NOT NULL DEFAULT '',
  recebido_em INTEGER NOT NULL            -- milissegundos desde 1970, horário do servidor
);

CREATE INDEX giros_momento ON giros (momento);

-- Ganhadores de cupom cadastrados pelo operador. Cada giro aceita no máximo um cadastro.
CREATE TABLE cadastros (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  giro_id       TEXT    NOT NULL UNIQUE REFERENCES giros (id),
  premio        TEXT    NOT NULL,
  codigo        TEXT    NOT NULL UNIQUE,
  nome          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  telefone      TEXT    NOT NULL,            -- somente dígitos
  marketing     INTEGER NOT NULL DEFAULT 0,  -- aceitou receber comunicações
  evento        TEXT    NOT NULL DEFAULT '',
  aparelho      TEXT    NOT NULL DEFAULT '',
  criado_em     INTEGER NOT NULL,
  resgatado_em  INTEGER,
  resgatado_por TEXT
);

CREATE INDEX cadastros_criado_em ON cadastros (criado_em);
