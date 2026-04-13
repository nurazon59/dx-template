import { Box, Spinner, Center, Table, Tabs, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

interface XlsxViewerProps {
  url: string;
}

export function XlsxViewer({ url }: XlsxViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const XLSX = await import("xlsx");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });

        const parsed: SheetData[] = wb.SheetNames.map((name) => {
          const sheet = wb.Sheets[name];
          const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
          const [headers = [], ...rows] = json;
          return { name, headers: headers.map(String), rows: rows.map((r) => r.map(String)) };
        });

        if (!cancelled) {
          setSheets(parsed);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Excelファイルの読み込みに失敗しました");
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <Center h="40vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="40vh">
        <Text color="fg.error">{error}</Text>
      </Center>
    );
  }

  if (sheets.length === 0) {
    return (
      <Center h="40vh">
        <Text color="fg.muted">シートが見つかりません</Text>
      </Center>
    );
  }

  if (sheets.length === 1) {
    return <SheetTable sheet={sheets[0]} />;
  }

  return (
    <Tabs.Root defaultValue={sheets[0].name}>
      <Tabs.List>
        {sheets.map((s) => (
          <Tabs.Trigger key={s.name} value={s.name}>
            {s.name}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {sheets.map((s) => (
        <Tabs.Content key={s.name} value={s.name}>
          <SheetTable sheet={s} />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

function SheetTable({ sheet }: { sheet: SheetData }) {
  return (
    <Box overflowX="auto" maxH="70vh" overflowY="auto">
      <Table.Root size="sm" stickyHeader>
        <Table.Header>
          <Table.Row>
            {sheet.headers.map((h, i) => (
              <Table.ColumnHeader key={i} whiteSpace="nowrap">
                {h}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sheet.rows.map((row, ri) => (
            <Table.Row key={ri}>
              {sheet.headers.map((_, ci) => (
                <Table.Cell key={ci} whiteSpace="nowrap">
                  {row[ci] ?? ""}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
