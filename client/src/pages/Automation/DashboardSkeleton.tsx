import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardSkeletonProps {
  darkMode: boolean;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />;
}

export function DashboardSkeleton({ darkMode }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-5 w-12 rounded-full" />
              </div>
              <SkeletonBlock className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channels skeleton */}
      <Card className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}>
        <CardHeader>
          <SkeletonBlock className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <SkeletonBlock className="h-4 w-4" />
                <div>
                  <SkeletonBlock className="h-4 w-16" />
                  <SkeletonBlock className="h-3 w-12 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
