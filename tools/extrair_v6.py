"""Extrai fórmulas e valores da planilha v6 (somente leitura).
Uso: python3 -I tools/extrair_v6.py <planilha.xlsx> <saida.json> <pasta_formulas>
"""
import datetime, json, os, sys, warnings
import openpyxl
warnings.filterwarnings('ignore')

def conv(v):
    if isinstance(v, datetime.datetime): return {'d': v.date().isoformat()}
    if isinstance(v, datetime.date): return {'d': v.isoformat()}
    if type(v).__name__ == 'ArrayFormula': return v.text
    return v

def main(src, out, pasta):
    wf = openpyxl.load_workbook(src)
    wv = openpyxl.load_workbook(src, data_only=True)
    os.makedirs(pasta, exist_ok=True)
    abas = {}
    for ws in wf.worksheets:
        if ws.title == 'GUIA': continue
        f, v, linhas = {}, {}, []
        for row in ws.iter_rows():
            for c in row:
                if c.value is None: continue
                fv = conv(c.value)
                f[c.coordinate] = fv
                v[c.coordinate] = conv(wv[ws.title][c.coordinate].value)
                if isinstance(fv, str) and fv.startswith('='):
                    linhas.append(f'{c.coordinate} | {fv}')
        abas[ws.title.strip()] = {'f': f, 'v': v}
        if linhas:
            with open(os.path.join(pasta, ws.title.strip() + '.txt'), 'w', encoding='utf-8') as fh:
                fh.write('\n'.join(linhas) + '\n')
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump({'abas': abas}, fh, ensure_ascii=False, separators=(',', ':'))

if __name__ == '__main__':
    main(*sys.argv[1:4])
