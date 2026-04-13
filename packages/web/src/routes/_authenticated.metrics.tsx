import { Box, Container, Heading, SimpleGrid, Stack, Table, Text } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetApiAgentMetricsSummarySuspense,
  useGetApiAgentMetricsDailySuspense,
  useGetApiAgentMetricsToolUsageSuspense,
  useGetApiAgentMetricsRunsSuspense,
} from "../lib/api/generated";

export const Route = createFileRoute("/_authenticated/metrics")({
  component: MetricsPage,
});

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold">
        {value}
      </Text>
    </Box>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function MetricsPage() {
  const { data: summaryRes } = useGetApiAgentMetricsSummarySuspense();
  const { data: dailyRes } = useGetApiAgentMetricsDailySuspense();
  const { data: toolRes } = useGetApiAgentMetricsToolUsageSuspense();
  const { data: runsRes } = useGetApiAgentMetricsRunsSuspense();

  const summary = summaryRes.status === 200 ? summaryRes.data : null;
  const dailyStats = dailyRes.status === 200 ? dailyRes.data.stats : [];
  const toolUsage = toolRes.status === 200 ? toolRes.data.tools : [];
  const runs = runsRes.status === 200 ? runsRes.data.runs : [];

  const errorRate =
    summary && summary.totalRuns > 0
      ? ((summary.errorCount / summary.totalRuns) * 100).toFixed(1)
      : "0.0";

  return (
    <Container maxW="6xl" py={10}>
      <Stack gap={6}>
        <Box>
          <Heading size="2xl">メトリクス</Heading>
          <Text color="fg.muted" mt={2}>
            エージェント実行メトリクス
          </Text>
        </Box>

        <SimpleGrid columns={3} gap={4}>
          <StatCard label="総 Runs" value={summary?.totalRuns ?? 0} />
          <StatCard label="総トークン" value={summary?.totalTokens.toLocaleString() ?? "0"} />
          <StatCard label="エラー率" value={`${errorRate}%`} />
        </SimpleGrid>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="sm" mb={4}>
            日別推移
          </Heading>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="runs" stroke="#3182CE" name="Runs" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalTokens"
                  stroke="#38A169"
                  name="トークン"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Text color="fg.muted">日別データはまだありません</Text>
          )}
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="sm" mb={4}>
            ツール別使用回数
          </Heading>
          {toolUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={toolUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="toolName" width={120} />
                <Tooltip />
                <Bar dataKey="usageCount" fill="#3182CE" name="使用回数" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text color="fg.muted">ツール使用データはまだありません</Text>
          )}
        </Box>

        <Box>
          <Heading size="sm" mb={4}>
            直近の Runs
          </Heading>
          {runs.length > 0 ? (
            <Table.Root variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>時刻</Table.ColumnHeader>
                  <Table.ColumnHeader>モデル</Table.ColumnHeader>
                  <Table.ColumnHeader>トークン</Table.ColumnHeader>
                  <Table.ColumnHeader>時間</Table.ColumnHeader>
                  <Table.ColumnHeader>ツール</Table.ColumnHeader>
                  <Table.ColumnHeader>ステータス</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {runs.map((run) => (
                  <Table.Row key={run.id}>
                    <Table.Cell>
                      <Text fontSize="sm">{new Date(run.finishedAt).toLocaleString("ja-JP")}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{run.model}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{run.totalTokens.toLocaleString()}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{formatDuration(run.durationMs)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">
                        {run.toolTrace ? run.toolTrace.map((t) => t.toolName).join(", ") : "-"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm" color={run.isError ? "fg.error" : "fg.muted"}>
                        {run.isError ? "エラー" : "成功"}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          ) : (
            <Text color="fg.muted">実行データはまだありません</Text>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
