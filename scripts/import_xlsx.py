"""Importa o histórico da planilha do bolão para data/bolao.json.

Uso: python scripts/import_xlsx.py "caminho/Planilha Bolão Papini 2026 [OFICIAL].xlsx"
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter

# Nome usado no cabeçalho de cada rodada -> nome exibido no site
CANONICAL = {
    "Marcos": "Marcos", "Mateus": "Mateus", "Bernardo": "Bernardo", "Mauro": "Mauro",
    "Hélio": "Helinho", "Márcio": "Márcio", "Taty": "Taty", "Grazielle": "Grazielle",
    "Filipe": "Filipe", "Daniele": "Danielle", "Daniel": "Daniel", "Juliana": "Juliana",
    "Natália": "Natália", "Rodrigo": "Rodrigo", "Victor": "Victor",
}
ATLETICO = "Atlético"
PICK_RE = re.compile(r"^\s*(\d+)\s*[xX]\s*(\d+)\s*$")


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def parse_pick(v):
    if v is None:
        return None
    m = PICK_RE.match(str(v))
    return [int(m.group(1)), int(m.group(2))] if m else None


def outcome(h, a):
    return (h > a) - (h < a)


def score(pick, home, away, hs, as_):
    if pick is None or hs is None or as_ is None:
        return 0
    galo = ATLETICO in (home, away)
    if pick == [hs, as_]:
        return 7 if galo else 5
    if outcome(*pick) == outcome(hs, as_):
        return 3 if galo else 1
    return 0


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Rodadas"]
    rows = list(ws.iter_rows(values_only=True))

    rounds, upcoming, people, mismatches = [], [], {}, []
    for i, row in enumerate(rows):
        label = row[0]
        if not (isinstance(label, str) and "RODADA" in label):
            continue
        number = int(re.match(r"\d+", label).group())
        # pares (palpite, pontos) a partir da coluna G
        cols = []
        for c in range(6, len(row), 2):
            name = row[c]
            if name:
                cols.append((c, CANONICAL.get(str(name).strip(), str(name).strip())))
        games = []
        for j, r in enumerate(rows[i + 1:], start=i + 2):  # j = linha no Excel
            if not r[1] or r[1] == "Casa":
                break
            home, hs, as_, away = r[1], r[2], r[4], r[5]
            hs = hs if isinstance(hs, (int, float)) else None
            as_ = as_ if isinstance(as_, (int, float)) else None
            hs, as_ = (int(hs) if hs is not None else None), (int(as_) if as_ is not None else None)
            picks = {}
            for c, name in cols:
                pick = parse_pick(r[c])
                pts = score(pick, home, away, hs, as_)
                sheet_pts = r[c + 1] if isinstance(r[c + 1], (int, float)) else 0
                entry = {"pick": pick, "points": pts}
                # a pontuação oficial é a da regra; guardamos o que estava na planilha quando diverge
                if hs is not None and pts != sheet_pts:
                    entry["sheetPoints"] = int(sheet_pts)
                    mismatches.append(f"R{number} {home} x {away} {name}: célula {get_column_letter(c + 2)}{j} "
                                      f"tem {int(sheet_pts)}, pela regra é {pts} (palpite {r[c]!r}, placar {hs}x{as_})")
                picks[slugify(name)] = entry
                people.setdefault(slugify(name), name)
            games.append({"home": home, "away": away, "homeScore": hs, "awayScore": as_,
                          "postponed": hs is None, "picks": picks})
        # onde a rodada fica na planilha: 1ª linha de jogos e a ordem das colunas a partir de G
        sheet = {"row": i + 2, "columns": [slugify(name) for _, name in cols]}
        played = any(g["homeScore"] is not None for g in games)
        if not played:
            upcoming.append({"number": number, "sheet": sheet,
                             "games": [{"home": g["home"], "away": g["away"]} for g in games]})
            continue
        # quem participou da rodada (pelo menos um palpite)
        participants = sorted({p for g in games for p, v in g["picks"].items() if v["pick"]})
        rounds.append({"number": number, "games": games, "participants": participants, "sheet": sheet})

    # participantes que realmente palpitaram em alguma rodada
    active = sorted({p for r in rounds for p in r["participants"]} |
                    {p for r in rounds for g in r["games"] for p in g["picks"]})
    # bônus = total da aba "Tabela por rodada" - soma dos pontos que estavam na planilha
    # (o "+10" que o Daniel soma na fórmula quando há bônus, como acerto de cruzamentos)
    adjustments = []
    tab = wb["Tabela por rodada"]
    for r in tab.iter_rows(min_row=8, values_only=True):
        if not r[1]:
            continue
        pid = slugify(r[1])
        for rd in rounds:
            official = r[3 + rd["number"] - 1]
            if not isinstance(official, (int, float)):
                continue
            calc = sum(pk.get("sheetPoints", pk["points"]) for g in rd["games"] if (pk := g["picks"].get(pid)))
            if official != calc:
                adjustments.append({"round": rd["number"], "participant": pid, "points": official - calc,
                                    "reason": "Bônus especial"})

    data = {
        "season": 2026,
        "title": "Bolão Maurício Papini",
        "rules": {"exact": 5, "outcome": 1, "galoExact": 7, "galoOutcome": 3, "galoTeam": ATLETICO},
        "participants": [{"id": p, "name": people[p]} for p in active],
        "rounds": rounds,
        "adjustments": adjustments,
        "upcoming": upcoming,
    }
    out = Path(__file__).resolve().parent.parent / "data" / "bolao.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(rounds)} rodadas, {len(active)} participantes -> {out}")
    print(f"{len(adjustments)} bônus: {adjustments}")
    print(f"{len(mismatches)} pontos corrigidos pela regra (a planilha tem outro valor):")
    for m in mismatches:
        print("  ", m)


if __name__ == "__main__":
    main(sys.argv[1])
