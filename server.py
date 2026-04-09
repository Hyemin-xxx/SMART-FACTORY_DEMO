#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
import posixpath
import zipfile
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
PORT = 9000

NS_MAIN = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NS_REL = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}


def _read_xml_from_zip(workbook_zip: zipfile.ZipFile, path: str) -> ET.Element:
    return ET.fromstring(workbook_zip.read(path))


def _column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for char in letters:
        index = (index * 26) + (ord(char.upper()) - 64)
    return max(index - 1, 0)


def _load_shared_strings(workbook_zip: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in workbook_zip.namelist():
        return []

    root = _read_xml_from_zip(workbook_zip, "xl/sharedStrings.xml")
    strings: list[str] = []

    for item in root.findall("main:si", NS_MAIN):
        parts = item.findall(".//main:t", NS_MAIN)
        strings.append("".join(part.text or "" for part in parts))

    return strings


def _load_sheet_paths(workbook_zip: zipfile.ZipFile) -> tuple[list[dict[str, str]], dict[str, str]]:
    workbook_root = _read_xml_from_zip(workbook_zip, "xl/workbook.xml")
    rels_root = _read_xml_from_zip(workbook_zip, "xl/_rels/workbook.xml.rels")

    rel_map: dict[str, str] = {}
    for rel in rels_root.findall("rel:Relationship", NS_REL):
      target = rel.attrib.get("Target", "")
      rel_map[rel.attrib["Id"]] = posixpath.normpath(posixpath.join("xl", target))

    sheets: list[dict[str, str]] = []
    for sheet in workbook_root.findall("main:sheets/main:sheet", NS_MAIN):
        rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id", "")
        sheets.append(
            {
                "name": sheet.attrib.get("name", "Sheet"),
                "sheetId": sheet.attrib.get("sheetId", ""),
                "path": rel_map.get(rel_id, ""),
            }
        )

    return sheets, rel_map


def _extract_sheet_rows(workbook_zip: zipfile.ZipFile, sheet_path: str, shared_strings: list[str]) -> list[list[str]]:
    if not sheet_path or sheet_path not in workbook_zip.namelist():
        return []

    root = _read_xml_from_zip(workbook_zip, sheet_path)
    sheet_data = root.find("main:sheetData", NS_MAIN)
    if sheet_data is None:
        return []

    rows: list[list[str]] = []
    for row in sheet_data.findall("main:row", NS_MAIN):
        cells = row.findall("main:c", NS_MAIN)
        if not cells:
            continue

        row_values: list[str] = []
        for cell in cells:
            ref = cell.attrib.get("r", "")
            cell_type = cell.attrib.get("t")
            raw_value = cell.findtext("main:v", default="", namespaces=NS_MAIN)

            if cell_type == "s":
                try:
                    value = shared_strings[int(raw_value)]
                except (ValueError, IndexError):
                    value = ""
            elif cell_type == "inlineStr":
                value = "".join(text.text or "" for text in cell.findall(".//main:t", NS_MAIN))
            else:
                value = raw_value

            column_idx = _column_index(ref)
            while len(row_values) <= column_idx:
                row_values.append("")
            row_values[column_idx] = value.strip()

        if any(value.strip() for value in row_values):
            rows.append(row_values)

    return rows


def parse_xlsx_workbook(encoded_content: str) -> dict:
    workbook_bytes = base64.b64decode(encoded_content)
    with zipfile.ZipFile(io.BytesIO(workbook_bytes)) as workbook_zip:
        sheets, _ = _load_sheet_paths(workbook_zip)
        shared_strings = _load_shared_strings(workbook_zip)

        parsed_sheets: list[dict] = []
        for sheet in sheets:
            rows = _extract_sheet_rows(workbook_zip, sheet["path"], shared_strings)
            preview_rows = rows[:6]
            non_empty_count = sum(1 for row in rows if any(cell.strip() for cell in row))
            parsed_sheets.append(
                {
                    "name": sheet["name"],
                    "sheetId": sheet["sheetId"],
                    "previewRows": preview_rows,
                    "nonEmptyRowCount": non_empty_count,
                }
            )

    return {
        "sheetCount": len(parsed_sheets),
        "sheetNames": [sheet["name"] for sheet in parsed_sheets],
        "sheets": parsed_sheets,
    }


def _pick_sheet(parsed_workbook: dict, index: int) -> dict:
    sheets = parsed_workbook.get("sheets", [])
    if index < len(sheets):
        return sheets[index]
    return {"name": f"Sheet {index + 1}", "previewRows": [], "nonEmptyRowCount": 0}


def _row_to_text(row: list[str]) -> str:
    return " | ".join(cell for cell in row if cell and cell.strip())


def build_demo_workbook_from_parsed(parsed_workbook: dict, filename: str) -> dict:
    sheet_a = _pick_sheet(parsed_workbook, 0)
    sheet_b = _pick_sheet(parsed_workbook, 1)
    sheet_c = _pick_sheet(parsed_workbook, 2)

    project_name = Path(filename).stem
    project_summary = _row_to_text(sheet_a.get("previewRows", [[], []])[1] if len(sheet_a.get("previewRows", [])) > 1 else [])
    process_summary = _row_to_text(sheet_b.get("previewRows", [[], []])[1] if len(sheet_b.get("previewRows", [])) > 1 else [])
    equipment_summary = _row_to_text(sheet_c.get("previewRows", [[], []])[1] if len(sheet_c.get("previewRows", [])) > 1 else [])

    return {
        "projectOverview": [
            {"field": "Project Name", "value": project_name, "notes": f"Source workbook: {filename}"},
            {"field": "Workbook Sheet 1", "value": sheet_a["name"], "notes": f"Rows detected: {sheet_a['nonEmptyRowCount']}"},
            {"field": "Workbook Sheet 2", "value": sheet_b["name"], "notes": f"Rows detected: {sheet_b['nonEmptyRowCount']}"},
            {"field": "Workbook Sheet 3", "value": sheet_c["name"], "notes": f"Rows detected: {sheet_c['nonEmptyRowCount']}"},
            {"field": "Sheet 1 Preview", "value": project_summary or "Preview not available", "notes": "첫 번째 핵심 시트 미리보기"},
            {"field": "Workbook Scope", "value": f"{parsed_workbook.get('sheetCount', 0)} total sheets", "notes": "다중 시트 구조 감지 결과"},
        ],
        "processDefinition": [
            {"field": "Primary Process Sheet", "value": sheet_b["name"], "notes": "공정 흐름 관련 시트 후보"},
            {"field": "Sheet 2 Preview", "value": process_summary or "Preview not available", "notes": "두 번째 핵심 시트 미리보기"},
            {"field": "Process Flow Goal", "value": "Seed -> Production -> Harvest -> Purification -> UF/DF -> Fill Prep", "notes": "머메이드 공정도 기본 흐름"},
            {"field": "Server Request Context", "value": "Generate CCD conceptual package", "notes": "서버 패키지 생성 요청"},
            {"field": "Workbook Mapping", "value": "Source workbook mapped into 3 demo sheets", "notes": "다중 시트 -> 데모 시트 변환"},
            {"field": "Detected Sheet Names", "value": ", ".join(parsed_workbook.get("sheetNames", [])[:6]), "notes": "앞쪽 시트명 요약"},
        ],
        "equipmentCost": [
            {"field": "Equipment Source Sheet", "value": sheet_c["name"], "notes": "장비/비용 관련 시트 후보"},
            {"field": "Sheet 3 Preview", "value": equipment_summary or "Preview not available", "notes": "세 번째 핵심 시트 미리보기"},
            {"field": "Budget Mode", "value": "Conceptual CAPEX ROM", "notes": "Rough order of magnitude cost mode"},
            {"field": "Budget Assumption", "value": "Equipment + cleanroom + utilities", "notes": "예산 요약 계산 범위"},
            {"field": "Equipment Summary", "value": "Bioreactor / Chromatography / UFDF", "notes": "기본 장비 구성"},
            {"field": "Workbook Parsing Mode", "value": "XLSX zip/xml parser", "notes": "External dependency 없이 분석"},
        ],
    }


def build_mermaid_diagram(feature_flags: dict[str, bool]) -> str:
    automation_node = (
        "Automation[Automation / Control Layer]"
        if feature_flags.get("includeAutomation")
        else "Review[Manual review checkpoints]"
    )
    single_use_node = (
        "SUT[Single-use bioreactor train]"
        if feature_flags.get("includeSingleUse")
        else "Steel[Stainless upstream train]"
    )

    return "\n".join(
        [
            "flowchart LR",
            "  Input[Workbook Inputs] --> Basis[Design Basis Review]",
            f"  Basis --> {single_use_node}",
            f"  {single_use_node} --> Harvest[Harvest / Clarification]",
            "  Harvest --> DSP[Chromatography + UF/DF]",
            f"  DSP --> {automation_node}",
            "  DSP --> Docs[CCD Package Document]",
            "  DSP --> Equip[Equipment List]",
            "  DSP --> Budget[ROM Budget Summary]",
        ]
    )


def build_ccd_package(payload: dict) -> dict:
    project = payload.get("project", {})
    feature_flags = payload.get("featureFlags", {})
    workbook_sheets = payload.get("workbookSheets", {})
    metadata = payload.get("metadata", {})
    sheet_count = metadata.get("sheetCount", len(workbook_sheets))
    parsed_workbook = payload.get("parsedWorkbook") or {}

    budget_items = [
        {
            "category": "Process Equipment",
            "estimate": "$2.8M",
            "note": "Core upstream + downstream skids",
        },
        {
            "category": "Cleanroom & HVAC",
            "estimate": "$1.9M",
            "note": f"{project.get('cleanroomGrade', 'Grade C')} baseline cleanroom envelope",
        },
        {
            "category": "Utilities & Infrastructure",
            "estimate": "$1.2M",
            "note": "Included in current ROM"
            if feature_flags.get("includeUtilities")
            else "Placeholder allowance",
        },
        {
            "category": "Automation / Integration",
            "estimate": "$0.7M" if feature_flags.get("includeAutomation") else "$0.25M",
            "note": "Automation scope enabled"
            if feature_flags.get("includeAutomation")
            else "Deferred to later phase",
        },
    ]

    equipment_rows = [
        {
            "name": "Single-use seed bioreactor"
            if feature_flags.get("includeSingleUse")
            else "Seed bioreactor",
            "qty": "2",
            "capacity": "50 L / 200 L",
            "area": "Upstream",
        },
        {
            "name": "Single-use production bioreactor"
            if feature_flags.get("includeSingleUse")
            else "Production bioreactor",
            "qty": "2",
            "capacity": "2,000 L"
            if project.get("facilityScale") == "Commercial"
            else "500 L",
            "area": "Upstream",
        },
        {
            "name": "Chromatography skid",
            "qty": "1",
            "capacity": "Pilot-scale train",
            "area": "Downstream",
        },
        {
            "name": "UF/DF skid",
            "qty": "1",
            "capacity": "Single train",
            "area": "Downstream",
        },
    ]

    design_notes = project.get("designNotes") or "추가 설계 메모 없음"
    workbook_summary = (
        f"업로드된 워크북에서 {parsed_workbook.get('sheetCount', sheet_count)}개 시트를 감지했고, "
        f"앞선 시트명은 {', '.join(parsed_workbook.get('sheetNames', [])[:5]) or 'N/A'} 입니다."
    )
    document_sections = [
        {
            "title": "1. Design Basis Summary",
            "body": (
                f"{project.get('projectName', 'Untitled Project')}는 "
                f"{project.get('facilityScale', 'Pilot')} 규모의 "
                f"{project.get('productType', 'bioprocess product')} 생산을 목표로 하며, "
                f"{project.get('batchStrategy', 'Fed-batch')} 전략과 "
                f"{project.get('cleanroomGrade', 'Grade C')} 기준을 기반으로 CCD 개념설계를 수행합니다."
            ),
        },
        {
            "title": "2. Input Workbook Summary",
            "body": (
                f"총 {sheet_count}개 데모 시트가 서버로 전달되었고, "
                "Project Overview / Process Definition / Equipment & Cost 시트의 입력을 기반으로 "
                f"문서형 CCD 패키지를 생성했습니다. {workbook_summary}"
            ),
        },
        {
            "title": "3. Process Concept",
            "body": (
                f"{'Single-use 기반' if feature_flags.get('includeSingleUse') else 'Stainless 기반'} "
                "upstream와 표준 downstream train을 결합하고, utility interface, equipment scope, "
                f"design basis memo를 함께 정리합니다. 주요 설계 메모: {design_notes}"
            ),
        },
        {
            "title": "4. Deliverables",
            "body": (
                "개념 공정도, CCD conceptual document, equipment list, ROM budget summary, "
                "open items register, next-step action proposal을 포함합니다."
            ),
        },
    ]

    open_items = [
        "URS 기준 필수 입력 컬럼과 각 시트 책임 구간을 확정할 것",
        "유틸리티 demand 산정 로직과 cleanroom zoning 기준을 연결할 것",
        "ROM budget 산정식을 reference cost DB 또는 견적 로직과 연결할 것",
    ]

    return {
        "packageTitle": f"{project.get('projectName', 'Untitled Project')} CCD Conceptual Design Package",
        "requestId": f"CCD-{datetime.now().strftime('%H%M%S')}",
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "responseMode": "Server API OK",
        "mermaid": build_mermaid_diagram(feature_flags),
        "documentSections": document_sections,
        "equipmentRows": equipment_rows,
        "budgetItems": budget_items,
        "openItems": open_items,
    }


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON payload"}, HTTPStatus.BAD_REQUEST)
            return

        if parsed.path == "/api/parse-workbook":
            try:
                filename = payload.get("filename", "uploaded-workbook.xlsx")
                parsed_workbook = parse_xlsx_workbook(payload.get("contentBase64", ""))
                mapped_sheets = build_demo_workbook_from_parsed(parsed_workbook, filename)
            except Exception as exc:  # pragma: no cover - demo fallback
                self._send_json({"error": f"Workbook parsing failed: {exc}"}, HTTPStatus.BAD_REQUEST)
                return

            self._send_json(
                {
                    "responseMode": "Workbook Parsed",
                    "parsedWorkbook": parsed_workbook,
                    "mappedWorkbookSheets": mapped_sheets,
                },
                HTTPStatus.OK,
            )
            return

        if parsed.path == "/api/ccd-package":
            response = build_ccd_package(payload)
            self._send_json(response, HTTPStatus.OK)
            return

        self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"BioForge CCD Studio server running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
