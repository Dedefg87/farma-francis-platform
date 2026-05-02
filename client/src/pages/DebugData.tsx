import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DebugData() {
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // @ts-ignore - usando query direta
        const result = await trpc.agents.list.query({
          page: 1,
          pageSize: 50,
          timeRange: "all",
          sortBy: "satisfaction",
        });
        setRawData(result);
      } catch (error) {
        console.error("Error:", error);
        setRawData({ error: String(error) });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="mt-20 p-8">Carregando dados...</div>;

  return (
    <>
      <TopBar />
      <div className="container py-8 mt-16 space-y-6">
        <h1 className="text-2xl font-bold">Diagnóstico de Dados</h1>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Dados Brutos da API</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(rawData, null, 2)}
          </pre>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Resumo</h2>
          {rawData?.agents ? (
            <div>
              <p>
                <strong>Total de Agentes:</strong> {rawData.agents.length}
              </p>
              <p>
                <strong>Pagination:</strong>{" "}
                {JSON.stringify(rawData.pagination)}
              </p>
              <ul className="mt-4 space-y-2">
                {rawData.agents.map((agent: unknown) => (
                  <li key={agent.id} className="border p-2 rounded">
                    <strong>{agent.name}</strong> (ID: {agent.id})<br />
                    Tickets: {agent.totalTickets} | Resolvidos:{" "}
                    {agent.resolvedTickets} | Satisfação:{" "}
                    {agent.satisfactionRate}%<br />
                    Email: {agent.email}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-red-500">Nenhum dado retornado ou erro na API</p>
          )}
        </Card>

        <Button onClick={() => window.location.reload()}>Recarregar</Button>
      </div>
    </>
  );
}
