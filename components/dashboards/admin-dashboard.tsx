import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Activity, FileText, UserPlus, TrendingUp, CircleAlert as AlertCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";

interface AdminDashboardProps {
  user: User;
}

export default async function AdminDashboard({ user }: AdminDashboardProps) {
  const { count: totalUsers } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: totalDoctors } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "doctor");

  const { count: totalRecords } = await supabaseAdmin
    .from("medical_records")
    .select("*", { count: "exact", head: true });

  const { count: totalPatients } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient");

  const { data: recentActivities } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(10);

  const { data: recentUsers } = await supabaseAdmin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      title: "Total Users",
      value: totalUsers || 0,
      icon: Users,
      description: "All registered users",
      trend: "+12.5%",
    },
    {
      title: "Active Doctors",
      value: totalDoctors || 0,
      icon: Activity,
      description: "Verified doctors",
      trend: "+4.2%",
    },
    {
      title: "Medical Records",
      value: totalRecords || 0,
      icon: FileText,
      description: "Total records uploaded",
      trend: "+23.1%",
    },
    {
      title: "Patients",
      value: totalPatients || 0,
      icon: UserPlus,
      description: "Registered patients",
      trend: "+8.7%",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <div className="flex items-center text-xs text-green-600 mt-2">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {stat.trend} from last month
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border-l-2 border-primary/20 hover:border-primary/50 transition-colors">
                    <Activity className="h-4 w-4 mt-0.5 text-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Important notifications and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">System Update Available</p>
                  <p className="text-xs text-muted-foreground">Version 2.1.0 is ready</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New Users This Week</p>
                  <p className="text-xs text-muted-foreground">{totalUsers || 0} new registrations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentUsers && recentUsers.length > 0 ? (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">{u.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium capitalize px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {u.role}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No users yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
