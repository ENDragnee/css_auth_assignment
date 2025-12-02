'use client';

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { checkAccess, getResources } from "../actions";

// Define strict types locally to match the server actions
type AccessType = "MAC" | "DAC" | "RBAC" | "RuBAC" | "ABAC";

interface AccessResultState {
  type: string;
  allowed: boolean;
  reason: string;
}

interface ResourceItem {
  _id: string;
  name: string;
  sensitivityLevel: string;
  ownerId: string;
  sharedWith: string[];
}

// Define the shape of our extended user for the UI
interface UserWithAttributes {
  name?: string | null;
  email?: string | null;
  role: string;
  department: string;
  clearanceLevel: number;
}

export default function Dashboard() {
  const { data: session } = useSession();

  const [result, setResult] = useState<AccessResultState | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  useEffect(() => {
    getResources().then(setResources);
  }, []);

  const testAccess = async (type: AccessType, payload: Record<string, unknown>) => {
    const res = await checkAccess(type, payload);
    setResult({ type, allowed: res.allowed, reason: res.reason });
  };

  if (!session || !session.user) return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      Loading...
    </div>
  );

  const user = session.user as UserWithAttributes;

  return (
    <div className="min-h-screen p-8 bg-background text-foreground transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.name}</h1>
          <div className="text-sm text-muted-foreground mt-2 flex gap-2">
            <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded font-medium">
              Role: {user.role}
            </span>
            <span className="bg-dracula-pink/10 text-dracula-pink border border-dracula-pink/20 px-2 py-1 rounded font-medium">
              Dept: {user.department}
            </span>
            <span className="bg-dracula-green/10 text-dracula-green border border-dracula-green/20 px-2 py-1 rounded font-medium">
              Clearance: {user.clearanceLevel}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="bg-destructive text-destructive-foreground px-4 py-2 rounded font-medium hover:bg-destructive/90 transition-colors shadow-sm"
        >
          Logout
        </button>
      </div>

      {result && (
        <div className={`p-4 mb-6 rounded border font-medium transition-all animate-in fade-in zoom-in-95 duration-200 ${result.allowed
          ? 'bg-dracula-green/20 text-dracula-green border-dracula-green/50'
          : 'bg-destructive/20 text-destructive border-destructive/50'
          }`}>
          <strong>{result.type} Result:</strong> {result.reason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. MAC */}
        <div className="bg-card text-card-foreground p-6 shadow-md rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 text-primary">1. MAC (Mandatory Access)</h2>
          <p className="text-sm text-muted-foreground mb-4">System enforces based on Sensitivity Labels.</p>
          <div className="flex gap-2">
            <button
              onClick={() => testAccess('MAC', { sensitivity: 'Public' })}
              className="bg-secondary text-secondary-foreground px-3 py-2 rounded hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              Access Public
            </button>
            <button
              onClick={() => testAccess('MAC', { sensitivity: 'Confidential' })}
              className="bg-dracula-purple/20 text-dracula-purple border border-dracula-purple/40 px-3 py-2 rounded hover:bg-dracula-purple/30 transition-colors text-sm font-medium"
            >
              Access Confidential
            </button>
          </div>
        </div>

        {/* 2. DAC */}
        <div className="bg-card text-card-foreground p-6 shadow-md rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 text-primary">2. DAC (Discretionary Access)</h2>
          <p className="text-sm text-muted-foreground mb-4">Access based on Ownership or specific sharing.</p>
          <ul className="space-y-2">
            {resources.slice(0, 3).map(r => (
              <li key={r._id} className="flex justify-between items-center border border-border bg-muted/30 p-2 rounded hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{r.name} <span className="text-xs text-muted-foreground font-normal">({r.sensitivityLevel})</span></span>
                <button
                  onClick={() => testAccess('DAC', { resourceId: r._id })}
                  className="text-primary text-sm underline hover:text-primary/80"
                >
                  Try Access
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. RBAC */}
        <div className="bg-card text-card-foreground p-6 shadow-md rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 text-primary">3. RBAC (Role Based)</h2>
          <p className="text-sm text-muted-foreground mb-4">Access based on your Job Role.</p>
          <div className="flex gap-2">
            <button
              onClick={() => testAccess('RBAC', { requiredRole: 'Manager' })}
              className="bg-dracula-pink/20 text-dracula-pink border border-dracula-pink/40 px-3 py-2 rounded hover:bg-dracula-pink/30 transition-colors text-sm font-medium"
            >
              Action: Manager
            </button>
            <button
              onClick={() => testAccess('RBAC', { requiredRole: 'Admin' })}
              className="bg-dracula-purple/20 text-dracula-purple border border-dracula-purple/40 px-3 py-2 rounded hover:bg-dracula-purple/30 transition-colors text-sm font-medium"
            >
              Action: Admin
            </button>
          </div>
        </div>

        {/* 4. RuBAC */}
        <div className="bg-card text-card-foreground p-6 shadow-md rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 text-primary">4. RuBAC (Rule Based)</h2>
          <p className="text-sm text-muted-foreground mb-4">Rules: Access only allowed 09:00 - 17:00.</p>
          <button
            onClick={() => testAccess('RuBAC', {})}
            className="w-full bg-secondary text-secondary-foreground border border-border px-3 py-2 rounded hover:bg-secondary/80 transition-colors font-medium"
          >
            Check Time Access
          </button>
        </div>

        {/* 5. ABAC */}
        <div className="bg-card text-card-foreground p-6 shadow-md rounded-lg border border-border">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2 text-primary">5. ABAC (Attribute Based)</h2>
          <p className="text-sm text-muted-foreground mb-4">Fine-grained attributes (Dept + Status).</p>
          <div className="space-y-2">
            <button
              onClick={() => testAccess('ABAC', { action: 'VIEW_SALARY' })}
              className="w-full text-left bg-muted/40 border border-border px-3 py-2 rounded hover:bg-muted/60 transition-colors text-sm"
            >
              <div className="font-medium">View Salary Data</div>
              <div className="text-xs text-muted-foreground">Req: Dept=Payroll & Status=Active</div>
            </button>
            <button
              onClick={() => testAccess('ABAC', { action: 'ACCESS_SERVER' })}
              className="w-full text-left bg-muted/40 border border-border px-3 py-2 rounded hover:bg-muted/60 transition-colors text-sm"
            >
              <div className="font-medium">Access Servers</div>
              <div className="text-xs text-muted-foreground">Req: Dept=IT</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
