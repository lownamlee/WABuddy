/** UI-only workspace. Layout references: shadcn-admin, Langflow and the supplied designs.
 * Canvas primitives are React Flow; BaseNode is copied from its official UI registry.
 * All interactions below operate on fictional local data, never the WhatsApp connector.
 */
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Coffee,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitBranch,
  ListChecks,
  MessageCircle,
  Network,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
  BaseNodeContent,
  BaseNodeFooter,
} from "./components/ui/base-node";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Switch } from "./components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import {
  activities,
  conversations,
  periods,
  periodSummary,
  type Period,
  type Conversation,
} from "./dashboard-data";
import "@xyflow/react/dist/style.css";

type Navigate = (page: string) => void;
type Phase = "Plan" | "Work" | "Check" | "Deliver";
const phaseNames: Phase[] = ["Plan", "Work", "Check", "Deliver"];
function Mark({
  icon: Icon = Sparkles,
  tone = "green",
}: {
  icon?: LucideIcon;
  tone?: string;
}) {
  return (
    <span className={`ws-mark ${tone}`}>
      <Icon size={19} />
    </span>
  );
}
function Person({ person }: { person: Conversation }) {
  return <span className={`ws-person ${person.color}`}>{person.initials}</span>;
}
function Pill({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <Badge className={`ws-pill ${tone}`} variant="secondary">
      <i />
      {children}
    </Badge>
  );
}
function Heading({
  title,
  detail,
  actions,
}: {
  title: string;
  detail?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="ws-heading">
      <div>
        <h1>{title}</h1>
        {detail && <p>{detail}</p>}
      </div>
      {actions && <div className="ws-heading-actions">{actions}</div>}
    </div>
  );
}
function downloadSample() {
  const csv =
    "Sample WABuddy report — fictional data only\r\nOrder,Customer,Amount MYR,Review\r\n" +
    conversations
      .map(
        (c) =>
          `${c.order},${c.name},${c.amount.replace("RM ", "")},${c.status}`,
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "wabuddy-sample-orders.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function GoalDialog({
  goal,
  onClose,
  onStart,
}: {
  goal: string;
  onClose: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState<"confirm" | "plan">("confirm");
  const [range, setRange] = useState("Today");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="ws-dialog">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? "Confirm scope" : "Review plan"}
          </DialogTitle>
          <DialogDescription>
            Interactive preview · example order-summary workflow
          </DialogDescription>
        </DialogHeader>
        <div className="ws-goal-quote">
          <Sparkles size={19} />
          <p>{goal}</p>
        </div>
        {step === "confirm" ? (
          <>
            <label className="ws-field-label">
              Which conversations should I use?
            </label>
            <Tabs value={range} onValueChange={setRange}>
              <TabsList>
                <TabsTrigger value="Today">Today</TabsTrigger>
                <TabsTrigger value="This week">This week</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ws-scope">
              <ShieldCheck size={20} />
              <div>
                <strong>Prepare a report for you</strong>
                <p>Keep customer replies for your review.</p>
              </div>
              <Check size={18} />
            </div>
            <Button onClick={() => setStep("plan")}>
              Show my plan <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <>
            <div className="ws-plan-list">
              {[
                "Read conversations and find orders",
                "Check prices against your menu",
                "Separate anything that needs your input",
                "Prepare your order summary",
              ].map((p, i) => (
                <div key={p}>
                  <span>{i + 1}</span>
                  <p>{p}</p>
                  <Check size={14} />
                </div>
              ))}
            </div>
            <div className="ws-plan-meta">
              <span>
                <Clock3 size={14} /> About 2 minutes
              </span>
              <span>
                <Network size={14} /> 4 specialists
              </span>
              <span>{range}</span>
            </div>
            <div className="ws-dialog-actions">
              <Button variant="outline" onClick={() => setStep("confirm")}>
                Adjust details
              </Button>
              <Button onClick={onStart}>
                Approve & preview <ArrowRight size={16} />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Composition and bar chart adapted from satnaing/shadcn-admin:
 * src/features/dashboard/index.tsx and components/overview.tsx (MIT).
 * Keeps WABuddy's original dashboard palette, panels and sidebar.
 */
function Overview({ go }: { go: Navigate }) {
  const [period, setPeriod] = useState<Period>("week");
  const [asking, setAsking] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState("");
  const data = periods[period];
  const summary = periodSummary(period);
  const chart = data.values.map((total, i) => ({
    day: data.labels[i],
    total,
    buddy: data.ai[i],
  }));
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Sample data · {data.range}</p>
        </div>
        <div className="heading-actions">
          <select
            aria-label="Dashboard period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            {Object.entries(periods).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={downloadSample}>
            <ArrowDownToLine size={15} /> Export
          </Button>
          <Button onClick={() => setAsking(!asking)}>
            <Sparkles size={15} /> Ask Buddy
          </Button>
        </div>
      </div>
      {asking && (
        <form
          className="ws-compact-prompt"
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim()) setGoal(prompt.trim());
          }}
        >
          <Input
            aria-label="Your goal for Buddy"
            placeholder="Ask Buddy…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button type="submit" disabled={!prompt.trim()}>
            Plan <ArrowRight size={15} />
          </Button>
        </form>
      )}
      <div className="stats-grid">
        {[
          {
            name: "Conversations",
            value: data.conversations,
            detail: `${data.change} this period`,
            icon: MessageCircle,
          },
          {
            name: "Handled by Buddy",
            value: data.handled,
            detail: `${summary.percent}% of conversations`,
            icon: Sparkles,
          },
          {
            name: "Confirmed orders",
            value: data.orders,
            detail: "From WhatsApp",
            icon: ShoppingBag,
          },
          {
            name: "First reply",
            value: data.response,
            detail: "Average response time",
            icon: Clock3,
          },
        ].map((stat) => (
          <Card className="stat-card" key={stat.name}>
            <div className="stat-top">
              <span>{stat.name}</span>
              <stat.icon size={17} />
            </div>
            <div className="stat-value">
              <strong>{stat.value}</strong>
            </div>
            <div className="stat-foot">
              <span>{stat.detail}</span>
            </div>
          </Card>
        ))}
      </div>
      <div className="analytics-grid">
        <Card className="conversation-card">
          <div className="section-title">
            <h2>Conversations</h2>
            <span className="today-label">{data.label}</span>
          </div>
          <div className="chart-toolbar">
            <div className="chart-legend">
              <span>
                <i /> All conversations
              </span>
              <span>
                <i /> Buddy handled
              </span>
            </div>
          </div>
          <div className="ws-dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                margin={{ top: 8, right: 20, left: -15, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                    borderColor: "#dfe6d5",
                  }}
                />
                <Bar
                  name="All conversations"
                  dataKey="total"
                  fill="#dce6ce"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Buddy handled"
                  dataKey="buddy"
                  fill="#7f9d66"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="buddy-performance">
          <div className="section-title">
            <h2>Buddy performance</h2>
            <Sparkles size={16} />
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: summary.handled }, { value: summary.human }]}
                  dataKey="value"
                  innerRadius={63}
                  outerRadius={77}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill="#829e69" />
                  <Cell fill="#dce5cf" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="ws-donut-label">
              <strong>{summary.percent}%</strong>
              <span>AI handled</span>
            </div>
          </div>
          <div className="performance-metrics">
            <div>
              <span>
                <i /> Buddy handled
              </span>
              <strong>{data.handled}</strong>
            </div>
            <div>
              <span>
                <i /> Human assisted
              </span>
              <strong>{summary.human.toLocaleString()}</strong>
            </div>
          </div>
          <div className="time-saved">
            <span>
              <Clock3 size={14} /> Estimated time saved
            </span>
            <strong>
              {summary.hoursSaved} <small>hrs</small>
            </strong>
          </div>
        </Card>
      </div>
      <div className="details-grid">
        <Card className="attention-card">
          <div className="section-title">
            <h2>
              Needs attention <span className="ws-count">3</span>
            </h2>
            <Button variant="ghost" onClick={() => go("Smart inbox")}>
              Open inbox <ArrowUpRight size={14} />
            </Button>
          </div>
          <div className="conversation-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.slice(0, 3).map((c) => (
                  <TableRow key={c.name}>
                    <TableCell>
                      <div className="person">
                        <span className={`contact-avatar ${c.color}`}>
                          {c.initials}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.topic}</small>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="message-preview">{c.message}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="status-badge warning">
                        <i />
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="muted-cell">{c.time}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Review ${c.name}`}
                        onClick={() => go("Smart inbox")}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        <Card className="activity-card">
          <div className="section-title">
            <h2>Recent activity</h2>
            <span className="today-label">Today</span>
          </div>
          <div className="activity-feed">
            {activities.map((activity, i) => (
              <button
                key={activity.title}
                onClick={() =>
                  go(
                    i === 0 ? "Orders" : i === 1 ? "Smart inbox" : "Agent team",
                  )
                }
              >
                <span className={`activity-icon ${activity.kind}`}>
                  {i === 0 ? (
                    <ShoppingBag size={15} />
                  ) : i === 1 ? (
                    <MessageCircle size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                </span>
                <div>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                  <small>{activity.time}</small>
                </div>
              </button>
            ))}
          </div>
          <button className="all-activity" onClick={() => go("Agent team")}>
            Agent team <ArrowRight size={13} />
          </button>
        </Card>
      </div>
      {goal && (
        <GoalDialog
          key={goal}
          goal={goal}
          onClose={() => setGoal("")}
          onStart={() => {
            setGoal("");
            go("Agent team");
          }}
        />
      )}
    </>
  );
}

type AgentData = {
  title: string;
  role: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  status: string;
  detail: string;
  coordinator?: boolean;
};
type AgentNode = Node<AgentData, "agent">;
const specialists = [
  {
    id: "buddy",
    position: { x: 0, y: 170 },
    data: {
      title: "Buddy",
      role: "YOUR COORDINATOR",
      description: "One goal. The right team.",
      icon: Sparkles,
      tone: "green",
      status: "Coordinating",
      detail: "Today’s order summary",
      coordinator: true,
    },
  },
  {
    id: "conversations",
    position: { x: 310, y: 10 },
    data: {
      title: "Conversation agent",
      role: "UNDERSTANDS YOUR CUSTOMERS",
      description: "Find orders and unanswered questions.",
      icon: MessageCircle,
      tone: "blue",
      status: "Reading",
      detail: "24 conversations in scope",
    },
  },
  {
    id: "orders",
    position: { x: 310, y: 225 },
    data: {
      title: "Order agent",
      role: "ORGANISES THE DETAILS",
      description: "Bring items, prices, and pickup times together.",
      icon: ShoppingBag,
      tone: "orange",
      status: "Organising",
      detail: "4 order drafts found",
    },
  },
  {
    id: "knowledge",
    position: { x: 310, y: 440 },
    data: {
      title: "Knowledge agent",
      role: "FINDS THE RIGHT SOURCE",
      description: "Match each answer to your business files.",
      icon: BookOpen,
      tone: "purple",
      status: "Checking sources",
      detail: "Menu & pickup policy",
    },
  },
  {
    id: "verifier",
    position: { x: 650, y: 150 },
    data: {
      title: "Quality checker",
      role: "CHECKS BEFORE DELIVERY",
      description: "Check totals, source messages, and missing details.",
      icon: ShieldCheck,
      tone: "green",
      status: "Waiting",
      detail: "Starts when the team is ready",
    },
  },
  {
    id: "result",
    position: { x: 650, y: 395 },
    data: {
      title: "Your order summary",
      role: "READY FOR YOU",
      description: "A clean order book with clear next steps.",
      icon: FileSpreadsheet,
      tone: "green",
      status: "Queued",
      detail: "Report + items to review",
    },
  },
];
function AgentCard({ data, selected }: NodeProps<AgentNode>) {
  return (
    <BaseNode
      className={`ws-agent-node ${data.coordinator ? "coordinator" : ""} ${selected ? "chosen" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <BaseNodeHeader>
        <Mark icon={data.icon} tone={data.tone} />
        <BaseNodeHeaderTitle>{data.title}</BaseNodeHeaderTitle>
        {data.coordinator && <span className="ws-node-star">✦</span>}
      </BaseNodeHeader>
      <BaseNodeContent>
        <span className="ws-node-role">{data.role}</span>
        <p>{data.description}</p>
        {data.coordinator && (
          <div className="ws-node-files">
            <span>
              <MessageCircle size={13} />
              Today’s conversations
            </span>
            <span>
              <FileText size={13} />
              Business knowledge
            </span>
          </div>
        )}
      </BaseNodeContent>
      <BaseNodeFooter>
        <span className="ws-node-status">
          <i
            className={
              [
                "Reading",
                "Organising",
                "Checking sources",
                "Validating",
              ].includes(data.status)
                ? "active"
                : ""
            }
          />
          {data.status}
        </span>
        <small>{data.detail}</small>
      </BaseNodeFooter>
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  );
}
const nodeTypes = { agent: AgentCard };
const connections = [
  ["buddy", "conversations"],
  ["buddy", "orders"],
  ["buddy", "knowledge"],
  ["conversations", "verifier"],
  ["orders", "verifier"],
  ["knowledge", "verifier"],
  ["verifier", "result"],
];
function AgentBoard() {
  const [phase, setPhase] = useState<Phase>("Work");
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState("buddy");
  const [rail, setRail] = useState("Plan");
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNode>(
    specialists.map((n) => ({
      ...n,
      type: "agent",
      selected: n.id === "buddy",
    })),
  );
  useEffect(() => {
    setNodes((old) =>
      old.map((n) => {
        const initial = specialists.find((s) => s.id === n.id)!;
        const status =
          phase === "Plan"
            ? "Awaiting approval"
            : phase === "Deliver"
              ? "Complete"
              : paused
                ? "Paused"
                : phase === "Check"
                  ? n.id === "verifier"
                    ? "Validating"
                    : n.id === "result"
                      ? "Queued"
                      : "Complete"
                  : initial.data.status;
        return {
          ...n,
          selected: n.id === active,
          data: { ...initial.data, status },
        };
      }),
    );
  }, [phase, paused, active, setNodes]);
  const edges: Edge[] = connections.map(([source, target]) => ({
    id: `${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    animated:
      !paused &&
      ((phase === "Work" && source === "buddy") ||
        (phase === "Check" && target === "verifier")),
    style: {
      stroke:
        phase === "Deliver" ||
        (phase === "Work" && source === "buddy") ||
        (phase === "Check" && target === "verifier")
          ? "#27a17a"
          : "#ccd8d2",
      strokeWidth: 1.7,
    },
    pathOptions: { borderRadius: 24 },
  }));
  const chosen = nodes.find((n) => n.id === active)!.data;
  return (
    <>
      <Heading
        title="Agent team"
        actions={
          <>
            <Pill tone="neutral">Interactive preview</Pill>
            <Button
              variant="outline"
              onClick={() => {
                setPhase("Plan");
                setPaused(false);
              }}
            >
              Review plan <ListChecks size={16} />
            </Button>
          </>
        }
      />
      <div className="ws-board-layout">
        <section className="ws-board">
          <div className="ws-board-top">
            <div>
              <Mark icon={Coffee} />
              <span>
                <strong>Today’s order summary</strong>
                <small>Sunday, 11 Oct · Sample run #024</small>
              </span>
            </div>
            <div className="ws-stage-tabs" aria-label="Preview workflow stage">
              {phaseNames.map((p, i) => (
                <button
                  key={p}
                  className={
                    phase === p
                      ? "active"
                      : phaseNames.indexOf(phase) > i
                        ? "complete"
                        : ""
                  }
                  onClick={() => {
                    setPhase(p);
                    setPaused(false);
                  }}
                >
                  <span>
                    {phaseNames.indexOf(phase) > i ? (
                      <Check size={12} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="ws-canvas-caption">
            <span>
              <Network size={14} /> YOUR AGENT TEAM
            </span>
            <span>Drag to explore · Select an agent</span>
          </div>
          <div className="ws-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeClick={(_, node) => {
                setActive(node.id);
                setRail("Agent");
              }}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.35}
              maxZoom={1.4}
              nodesConnectable={false}
              deleteKeyCode={null}
              colorMode="light"
              aria-label="Multi-agent workflow canvas"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1.15}
                color="#d9e2dd"
                bgColor="#fcfdfc"
              />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className="ws-run-bar">
            <Mark />
            <div>
              <strong>
                {phase === "Plan"
                  ? "Your plan is ready for review"
                  : paused
                    ? "Preview paused"
                    : phase === "Work"
                      ? "Turning conversations into a clear order book"
                      : phase === "Check"
                        ? "Checking sources, totals, and missing details"
                        : "Your sample results are ready"}
              </strong>
              <small>
                {phase === "Plan"
                  ? "4 steps · 4 specialists · Your approval comes first"
                  : phase === "Deliver"
                    ? "4 orders · 3 items for your review · 1 downloadable report"
                    : "Sample workflow · No customer messages are sent"}
              </small>
            </div>
            {phase === "Plan" ? (
              <Button onClick={() => setPhase("Work")}>
                Approve plan <ArrowRight size={15} />
              </Button>
            ) : phase === "Deliver" ? (
              <Button onClick={downloadSample}>
                <ArrowDownToLine size={15} />
                Sample report
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setPaused(!paused)}>
                {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
          </div>
        </section>
        <aside className="ws-board-rail">
          <Card className="ws-run-summary">
            <div>
              <span>THE GOAL</span>
              <Sparkles size={19} />
            </div>
            <h2>Today’s orders</h2>
            <div className="ws-run-counts">
              <span>
                <strong>
                  {phase === "Deliver"
                    ? "4"
                    : phase === "Plan"
                      ? "0"
                      : phase === "Work"
                        ? "1"
                        : "2"}
                  <small>/4</small>
                </strong>
                steps complete
              </span>
              <span>
                <strong>3</strong>items to review
              </span>
            </div>
            <div className="ws-progress">
              <i
                style={{
                  width:
                    phase === "Plan"
                      ? "5%"
                      : phase === "Work"
                        ? "48%"
                        : phase === "Check"
                          ? "78%"
                          : "100%",
                }}
              />
            </div>
          </Card>
          <Card className="ws-inspector">
            <Tabs value={rail} onValueChange={setRail}>
              <TabsList>
                <TabsTrigger value="Plan">The plan</TabsTrigger>
                <TabsTrigger value="Agent">Agent</TabsTrigger>
                <TabsTrigger value="Activity">Activity</TabsTrigger>
              </TabsList>
            </Tabs>
            {rail === "Plan" ? (
              <>
                <div className="ws-rail-steps">
                  {[
                    "Read customer conversations",
                    "Organise the order details",
                    "Check against your sources",
                    "Prepare your summary",
                  ].map((s, i) => (
                    <div key={s}>
                      <span
                        className={i < phaseNames.indexOf(phase) ? "done" : ""}
                      >
                        {i < phaseNames.indexOf(phase) ? (
                          <Check size={13} />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <p>
                        {s}
                        <small>
                          {
                            [
                              "Conversation agent",
                              "Order & knowledge agents",
                              "Quality checker",
                              "Buddy",
                            ][i]
                          }
                        </small>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="ws-rail-note">
                  <ShieldCheck size={18} />
                  <p>
                    You stay in control.
                    <br />
                    <small>Anything uncertain comes back to you.</small>
                  </p>
                </div>
              </>
            ) : rail === "Agent" ? (
              <div className="ws-agent-detail">
                <Mark icon={chosen.icon} tone={chosen.tone} />
                <h3>{chosen.title}</h3>
                <Pill tone="neutral">{chosen.status}</Pill>
                <p>{chosen.description}</p>
                <span className="ws-eyebrow">CURRENT HANDOFF</span>
                <div className="ws-handoff">
                  <ArrowRight size={15} />
                  {chosen.detail}
                </div>
                <span className="ws-eyebrow">SOURCES IN SCOPE</span>
                <p className="ws-source-link">
                  <FileText size={14} /> Business knowledge
                  <br />
                  <MessageCircle size={14} /> Sample conversations
                </p>
              </div>
            ) : (
              <div className="ws-event-list">
                {(phase === "Plan"
                  ? [
                      "Buddy prepared a four-step plan",
                      "Waiting for your approval",
                    ]
                  : phase === "Work"
                    ? [
                        "Buddy assigned the team",
                        "Conversation agent → Order agent",
                        "Knowledge agent found the menu",
                        "Quality checker is waiting for drafts",
                      ]
                    : phase === "Check"
                      ? [
                          "Order agent → Quality checker",
                          "Checking 4 totals against the menu",
                          "Allergen detail flagged for your review",
                        ]
                      : [
                          "Quality checks finished",
                          "3 open questions kept in the report",
                          "Buddy prepared your sample report",
                        ]
                ).map((s, i) => (
                  <div key={s}>
                    <i />
                    <span>
                      {s}
                      <small>Step {i + 1} · Sample event</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div className="ws-engine-label">
            <Zap size={14} />
            <span>
              WorkBuddy execution<span>Connection planned · UI preview</span>
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function SmartInbox() {
  const [selected, setSelected] = useState(conversations[0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Needs you");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState(false);
  const rows = conversations.filter(
    (c) =>
      (filter === "All" || c.status !== "AI handled") &&
      `${c.name} ${c.topic}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Smart inbox"
        actions={<Pill tone="amber">3 need a decision</Pill>}
      />
      <div className="ws-inbox">
        <aside className="ws-inbox-list">
          <div className="ws-inbox-list-head">
            <h2>
              Smart inbox <span>04</span>
            </h2>
            <div className="ws-search">
              <Search size={15} />
              <Input
                placeholder="Find a conversation…"
                aria-label="Find a conversation"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="Needs you">Needs you · 3</TabsTrigger>
                <TabsTrigger value="All">All conversations</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {rows.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                setSelected(c);
                setDraft("");
                setSaved(false);
                setSource(false);
              }}
              className={`ws-inbox-row ${selected.name === c.name ? "selected" : ""}`}
            >
              <Person person={c} />
              <span>
                <strong>
                  {c.name}
                  <small>{c.time.replace(" ago", "")}</small>
                </strong>
                <p>{c.message}</p>
                <Pill tone={c.status === "AI handled" ? "green" : "amber"}>
                  {c.topic}
                </Pill>
              </span>
            </button>
          ))}
          {!rows.length && <p className="ws-empty">No conversations found.</p>}
          <div className="ws-inbox-list-foot">
            <Sparkles size={14} /> The rest is in Buddy’s hands.
          </div>
        </aside>
        <section className="ws-conversation">
          <header>
            <Person person={selected} />
            <div>
              <h2>{selected.name}</h2>
              <small>Customer conversation · Sample</small>
            </div>
            <Pill tone="amber">{selected.status}</Pill>
          </header>
          <div className="ws-message-history">
            <span className="ws-date-divider">TODAY</span>
            <div className="ws-chat-message outgoing">
              Hi {selected.name.split(" ")[0]}! Thanks for your order. How can
              we help?
              <small>
                10:02 <CheckCheck size={12} />
              </small>
            </div>
            <div className="ws-chat-message">
              {selected.message}
              <small>10:04</small>
            </div>
            <div className="ws-chat-event">
              <ShieldCheck size={13} /> Buddy passed this to you
            </div>
            <div className="ws-context">
              <Sparkles size={17} />
              <div>
                <strong>The short version</strong>
                <p>{selected.detail}</p>
              </div>
            </div>
            {saved && (
              <div className="ws-chat-message outgoing draft">
                {draft}
                <small>Draft saved · not sent</small>
              </div>
            )}
          </div>
          <form
            className="ws-reply"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setSaved(true);
            }}
          >
            <textarea
              aria-label="Draft a reply"
              placeholder="Add your human touch…"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setSaved(false);
              }}
            />
            <div>
              <span>Preview · replies stay as drafts</span>
              <Button disabled={!draft.trim() || saved} type="submit">
                <Send size={14} />
                {saved ? "Saved" : "Save draft"}
              </Button>
            </div>
          </form>
        </section>
        <aside className="ws-customer-context">
          <div className="ws-assistant-title">
            <Sparkles size={17} /> Buddy’s context
          </div>
          <Mark icon={ShoppingBag} tone="orange" />
          <h3>{selected.order}</h3>
          <div className="ws-key-values">
            <span>
              Order value<strong>{selected.amount}</strong>
            </span>
            <span>
              Channel<strong>WhatsApp</strong>
            </span>
            <span>
              Next step<strong>Human review</strong>
            </span>
          </div>
          <div className="ws-evidence">
            <ShieldCheck size={17} />
            <strong>Why it needs you</strong>
            <p>
              {selected.topic === "Product question"
                ? "The menu has no verified allergen information."
                : selected.topic === "Payment check"
                  ? "A receipt needs payment verification."
                  : selected.topic === "Order confirmed"
                    ? "No follow-up is needed for this sample."
                    : "A change to pickup time needs your approval."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSource(!source)}
            >
              {source ? "Hide source" : "View source"}
              <ArrowUpRight size={13} />
            </Button>
            {source && (
              <blockquote>
                “{selected.message}”
                <small>Original sample message · 10:04</small>
              </blockquote>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Orders() {
  const [filter, setFilter] = useState("All orders");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const rows = conversations.filter(
    (c) =>
      `${c.name} ${c.order}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All orders" ||
        (filter === "Confirmed"
          ? ["Aisha Rahman", "Jason Tan"].includes(c.name)
          : !["Aisha Rahman", "Jason Tan"].includes(c.name))),
  );
  return (
    <>
      <Heading
        title="Orders"
        actions={
          <Button onClick={downloadSample}>
            <ArrowDownToLine size={15} />
            Export sample
          </Button>
        }
      />
      <div className="ws-order-summary">
        {[
          {
            label: "Sample order value",
            value: "RM 329.00",
            icon: ShoppingBag,
          },
          { label: "Confirmed orders", value: "2", icon: CheckCheck },
          { label: "Awaiting verification", value: "2", icon: ShieldCheck },
          { label: "Next collection", value: "Tomorrow, 8 am", icon: Clock3 },
        ].map((s) => (
          <Card key={s.label}>
            <Mark icon={s.icon} />
            <span>
              <small>{s.label}</small>
              <strong>{s.value}</strong>
            </span>
          </Card>
        ))}
      </div>
      <Card className="ws-data-panel">
        <div className="ws-table-toolbar">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              {["All orders", "Confirmed", "Needs review"].map((t) => (
                <TabsTrigger value={t} key={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="ws-search">
            <Search size={15} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search orders…"
              aria-label="Search orders"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Source</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.order}>
                <TableCell>
                  <strong>{c.order}</strong>
                  <small>11 October 2026</small>
                </TableCell>
                <TableCell>
                  <div className="ws-table-person">
                    <Person person={c} />
                    {c.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Pill
                    tone={
                      ["Aisha Rahman", "Jason Tan"].includes(c.name)
                        ? "green"
                        : "amber"
                    }
                  >
                    {["Aisha Rahman", "Jason Tan"].includes(c.name)
                      ? "Confirmed"
                      : c.name === "Nur Izzati"
                        ? "Payment review"
                        : "Draft"}
                  </Pill>
                </TableCell>
                <TableCell>
                  <strong>{c.amount}</strong>
                </TableCell>
                <TableCell>
                  <button
                    className="ws-text-button"
                    onClick={() => setSelected(c)}
                  >
                    <MessageCircle size={14} />
                    Conversation
                  </button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Review order ${c.order}`}
                    onClick={() => setSelected(c)}
                  >
                    <ArrowUpRight size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && <p className="ws-empty">No orders match this view.</p>}
        <div className="ws-table-footer">
          <span>{rows.length} sample orders</span>
          <span>
            <ShieldCheck size={14} /> Inquiries stay separate from confirmed
            orders
          </span>
        </div>
      </Card>
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="ws-dialog">
          <DialogHeader>
            <DialogTitle>{selected?.order} · Order evidence</DialogTitle>
            <DialogDescription>
              Fictional sample · source and review details
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="ws-table-person">
                <Person person={selected} />
                <strong>{selected.name}</strong>
                <Pill tone="amber">{selected.status}</Pill>
              </div>
              <blockquote className="ws-source-quote">
                “{selected.message}”
              </blockquote>
              <p>{selected.detail}</p>
              <div className="ws-scope">
                <ShieldCheck size={20} />
                <div>
                  <strong>{selected.amount}</strong>
                  <p>Source linked</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Customers() {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("Everyone");
  const [person, setPerson] = useState<Conversation | null>(null);
  const rows = conversations.filter(
    (c, i) =>
      c.name.toLowerCase().includes(query.toLowerCase()) &&
      (segment === "Everyone" ||
        (segment === "Returning" ? i % 2 === 0 : c.status !== "AI handled")),
  );
  return (
    <>
      <Heading title="Customers" />
      <Card className="ws-data-panel">
        <div className="ws-table-toolbar">
          <Tabs value={segment} onValueChange={setSegment}>
            <TabsList>
              {["Everyone", "Returning", "Needs follow-up"].map((t) => (
                <TabsTrigger value={t} key={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="ws-search">
            <Search size={15} />
            <Input
              aria-label="Find a customer"
              placeholder="Find a customer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Last conversation</TableHead>
              <TableHead>Latest order</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.name}>
                <TableCell>
                  <div className="ws-table-person">
                    <Person person={c} />
                    <span>
                      <strong>{c.name}</strong>
                      <small>WhatsApp customer</small>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <strong>{c.topic}</strong>
                  <small>{c.time}</small>
                </TableCell>
                <TableCell>
                  {c.order}
                  <small>{c.amount}</small>
                </TableCell>
                <TableCell>
                  <Pill
                    tone={
                      conversations.indexOf(c) % 2 === 0 ? "purple" : "neutral"
                    }
                  >
                    {conversations.indexOf(c) % 2 === 0
                      ? "Returning"
                      : "New customer"}
                  </Pill>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPerson(c)}
                  >
                    View profile <ArrowUpRight size={14} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!rows.length && (
          <p className="ws-empty">No customers match this view.</p>
        )}
        <div className="ws-table-footer">
          <span>{rows.length} customers</span>
          <span>Sample relationship data</span>
        </div>
      </Card>
      <Dialog
        open={!!person}
        onOpenChange={(v) => {
          if (!v) setPerson(null);
        }}
      >
        <DialogContent className="ws-dialog">
          <DialogHeader>
            <DialogTitle>{person?.name}</DialogTitle>
            <DialogDescription>Sample customer profile</DialogDescription>
          </DialogHeader>
          {person && (
            <>
              <div className="ws-profile-top">
                <Person person={person} />
                <div>
                  <h3>Customer notes</h3>
                  <p>
                    {person.topic} · {person.time}
                  </p>
                </div>
              </div>
              <div className="ws-key-values">
                <span>
                  Latest order<strong>{person.order}</strong>
                </span>
                <span>
                  Order value<strong>{person.amount}</strong>
                </span>
                <span>
                  Current status<strong>{person.status}</strong>
                </span>
              </div>
              <div className="ws-context">
                <Sparkles size={19} />
                <p>{person.detail}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Automations() {
  const [enabled, setEnabled] = useState([true, true, false]);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const recipes = [
    {
      name: "Welcome reply",
      icon: MessageCircle,
      tone: "blue",
      desc: "Answer everyday questions using your approved knowledge.",
      trigger: "When a customer asks",
      end: "Reply or ask you",
      scope: "Menu, opening hours, and pickup information.",
    },
    {
      name: "Your daily order book",
      icon: ShoppingBag,
      tone: "orange",
      desc: "Bring the day’s orders and loose ends into one clear summary.",
      trigger: "Every day at 6:00 pm",
      end: "Prepare a report",
      scope: "Today’s conversations and confirmed orders.",
    },
    {
      name: "A thoughtful follow-up",
      icon: Users,
      tone: "purple",
      desc: "Prepare a follow-up for customers who are still waiting.",
      trigger: "When a reply is overdue",
      end: "Save a draft for you",
      scope: "Unanswered conversations from the last 24 hours.",
    },
  ];
  return (
    <>
      <Heading
        title="Automations"
        actions={
          <Button
            onClick={() => {
              setSelected(0);
              setSaved(false);
            }}
          >
            <Plus size={16} />
            Add routine
          </Button>
        }
      />
      <div className="ws-recipe-grid">
        {recipes.map((r, i) => (
          <Card className="ws-recipe" key={r.name}>
            <div>
              <Mark icon={r.icon} tone={r.tone} />
              <Switch
                checked={enabled[i]}
                onCheckedChange={(v) =>
                  setEnabled((old) => old.map((x, j) => (j === i ? v : x)))
                }
                aria-label={`${r.name} preview enabled`}
              />
            </div>
            <Pill tone={enabled[i] ? "green" : "neutral"}>
              {enabled[i] ? "Enabled in preview" : "Paused"}
            </Pill>
            <h2>{r.name}</h2>
            <p>{r.desc}</p>
            <div className="ws-recipe-steps">
              <span>
                <Clock3 size={14} />
                {r.trigger}
              </span>
              <span>
                <GitBranch size={14} />
                {r.end}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(i);
                setSaved(false);
              }}
            >
              Review routine <ArrowUpRight size={14} />
            </Button>
          </Card>
        ))}
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="ws-dialog">
          <DialogHeader>
            <DialogTitle>
              {selected !== null ? recipes[selected].name : ""}
            </DialogTitle>
            <DialogDescription>
              Preview preferences only · no routine is scheduled
            </DialogDescription>
          </DialogHeader>
          {selected !== null && (
            <>
              <div className="ws-key-values">
                <span>
                  When<strong>{recipes[selected].trigger}</strong>
                </span>
                <span>
                  Then<strong>{recipes[selected].end}</strong>
                </span>
              </div>
              <div className="ws-scope">
                <ShieldCheck size={20} />
                <p>{recipes[selected].scope}</p>
              </div>
              <label className="ws-toggle-row">
                <span>Ask me about uncertain answers</span>
                <Switch
                  defaultChecked
                  aria-label="Ask me about uncertain answers"
                />
              </label>
              <Button onClick={() => setSaved(true)} disabled={saved}>
                {saved ? (
                  <>
                    <Check size={15} />
                    Preview saved
                  </>
                ) : (
                  "Save preview preferences"
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const knowledgeFiles = [
  {
    name: "Menu & prices",
    type: "PRODUCT KNOWLEDGE",
    icon: FileText,
    tag: "12 products",
    body: "The details behind a good recommendation.",
    updated: "Updated 10 Oct",
    sections: [
      [
        "Made with care. Priced clearly.",
        "Use these approved prices when helping customers choose or reviewing an order.",
      ],
      [
        "Coffee & drinks",
        "Flat white · RM 12\nIced matcha latte · RM 15\nCold brew · RM 14",
      ],
      [
        "From the kitchen",
        "Matcha cake · RM 120\nBreakfast box · RM 24\nChocolate brownie · RM 9",
      ],
    ],
  },
  {
    name: "Hours & pickup",
    type: "BUSINESS DETAILS",
    icon: Clock3,
    tag: "2 policies",
    body: "Opening hours and pickup policies.",
    updated: "Updated 9 Oct",
    sections: [
      ["Opening hours", "Monday–Saturday, 8 am–6 pm. Closed on Sunday."],
      [
        "Collecting an order",
        "Collect from the front counter. Share your name and order number when you arrive.",
      ],
      [
        "Changes to pickup",
        "Pickup-time changes should be reviewed by the owner before confirmation.",
      ],
    ],
  },
  {
    name: "Answers to review",
    type: "KNOWLEDGE GAPS",
    icon: ShieldCheck,
    tag: "1 needs you",
    body: "Missing business information.",
    updated: "Found today",
    sections: [
      [
        "Does the matcha cake contain nuts?",
        "The current menu does not include verified allergen information. Buddy should ask the owner.",
      ],
      [
        "Approved answer",
        "Add an approved answer below. In this preview it stays local and unpublished.",
      ],
    ],
  },
];
function Knowledge() {
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState("This file");
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState(false);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const file = knowledgeFiles[index];
  return (
    <>
      <Heading title="Knowledge" />
      <div className="ws-knowledge">
        <aside className="ws-file-list">
          <div>
            <FolderOpen size={18} />
            <strong>Your library</strong>
            <span>3</span>
          </div>
          {knowledgeFiles.map((f, i) => (
            <button
              key={f.name}
              onClick={() => {
                setIndex(i);
                setAsked(false);
                setSaved(false);
              }}
              className={index === i ? "selected" : ""}
            >
              <f.icon size={18} />
              <span>
                <strong>{f.name}</strong>
                <small>{f.tag}</small>
              </span>
              {i === 2 && <i />}
            </button>
          ))}
          <div className="ws-library-note">
            <ShieldCheck size={19} />
            <p>
              Approved knowledge.
              <br />
              Confident replies.
            </p>
          </div>
        </aside>
        <article className="ws-document">
          <div className="ws-document-meta">
            <span>{file.type}</span>
            <Pill tone={index === 2 ? "amber" : "green"}>
              {index === 2 ? "Needs review" : "Approved sample"}
            </Pill>
          </div>
          <h2>{file.name}</h2>
          <p className="ws-document-intro">{file.body}</p>
          <div className="ws-document-byline">
            <FileText size={13} />
            {file.updated}
            <span>·</span>Business owner
          </div>
          {file.sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
          {index === 0 && (
            <div className="ws-document-callout">
              <ShieldCheck size={18} />
              <p>
                <strong>One detail still needs you</strong>Allergen information
                for the matcha cake is missing.
                <button onClick={() => setIndex(2)}>
                  Review this question <ArrowRight size={13} />
                </button>
              </p>
            </div>
          )}
          {index === 2 && (
            <form
              className="ws-teach-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (answer.trim()) setSaved(true);
              }}
            >
              <label htmlFor="knowledge-answer">Your verified answer</label>
              <textarea
                id="knowledge-answer"
                placeholder="Add the answer Buddy should use…"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setSaved(false);
                }}
              />
              <Button disabled={!answer.trim() || saved}>
                {saved ? (
                  <>
                    <Check size={14} />
                    Saved as a preview draft
                  </>
                ) : (
                  "Save answer draft"
                )}
              </Button>
            </form>
          )}
          <footer>
            <FileCheck2 size={15} /> Sample document · Source retained for
            review
          </footer>
        </article>
        <aside className="ws-knowledge-assistant">
          <div className="ws-assistant-title">
            <Sparkles size={17} /> Ask Buddy
          </div>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setAsked(false);
            }}
          >
            <TabsList>
              <TabsTrigger value="This file">This file</TabsTrigger>
              <TabsTrigger value="All knowledge">All knowledge</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="ws-knowledge-chat">
            <Mark />
            <h3>Ask about this file</h3>
            <p>
              Explore what Buddy can answer from{" "}
              {tab === "This file" ? "this source" : "your library"}.
            </p>
            <button
              className="ws-question-chip"
              onClick={() => {
                setQuestion(
                  index === 2
                    ? "What information is missing?"
                    : "What can you answer from this?",
                );
                setAsked(true);
              }}
            >
              What can you answer from this?
              <ArrowUpRight size={13} />
            </button>
            {asked && (
              <>
                <div className="ws-assistant-question">{question}</div>
                <div className="ws-assistant-response">
                  <p>
                    {index === 2
                      ? "This source is missing verified allergen details. I would ask you before answering the customer."
                      : tab === "All knowledge"
                        ? "The sample library covers prices, opening hours, and pickup rules. Allergen details are still missing."
                        : index === 0
                          ? "I can answer questions about the listed products and prices. For allergens, I still need your verified information."
                          : "I can explain opening hours and pickup instructions. I would ask you to confirm a change to collection time."}
                  </p>
                  <div>
                    <FileText size={15} />
                    <strong>
                      {tab === "All knowledge" ? "Business library" : file.name}
                    </strong>
                    <small>
                      Sample source ·{" "}
                      {index === 0 ? "Menu section" : "Business knowledge"}
                    </small>
                  </div>
                </div>
              </>
            )}
          </div>
          <form
            className="ws-ask-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) setAsked(true);
            }}
          >
            <Input
              aria-label="Ask about your knowledge"
              placeholder="Ask about your knowledge…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button
              size="icon"
              aria-label="Preview knowledge answer"
              disabled={!question.trim()}
            >
              <ArrowRight size={16} />
            </Button>
          </form>
          <small className="ws-preview-note">
            Example responses · UI preview
          </small>
        </aside>
      </div>
    </>
  );
}

export function Workspace({ page, go }: { page: string; go: Navigate }) {
  return (
    <div className="ws-page" key={page}>
      {page === "Dashboard" ? (
        <Overview go={go} />
      ) : page === "Agent team" ? (
        <AgentBoard />
      ) : page === "Smart inbox" ? (
        <SmartInbox />
      ) : page === "Orders" ? (
        <Orders />
      ) : page === "Customers" ? (
        <Customers />
      ) : page === "Automations" ? (
        <Automations />
      ) : (
        <Knowledge />
      )}
    </div>
  );
}
