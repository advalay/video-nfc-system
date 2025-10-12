"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Edit, 
  ArrowLeft, 
  Download, 
  Trash2,
  Factory,
  Building2,
  ShoppingCart,
  Truck,
  Monitor,
  Heart,
  GraduationCap,
  School,
  Building,
  Plane
} from "lucide-react";
import Link from "next/link";

interface LeadData {
  companyId: string;
  companyName: string;
  url: string;
  description: string;
  industry: string; // 業界情報
  region: string; // 地域情報
  phoneNumber?: string; // 電話番号
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const industries = [
  "製造業",
  "建設業",
  "小売業",
  "運輸業",
  "ITサービス業",
  "医療福祉",
  "教育",
  "学校",
  "行政",
  "観光",
];

const regions = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
];

const prefectures = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

// 業界アイコンのマッピング
const getIndustryIcon = (industry: string) => {
  const iconMap: { [key: string]: { component: any, color: string } } = {
    "製造業": { component: Factory, color: "text-blue-600" },
    "建設業": { component: Building2, color: "text-orange-600" },
    "小売業": { component: ShoppingCart, color: "text-green-600" },
    "運輸業": { component: Truck, color: "text-purple-600" },
    "ITサービス業": { component: Monitor, color: "text-cyan-600" },
    "医療福祉": { component: Heart, color: "text-red-600" },
    "教育": { component: GraduationCap, color: "text-indigo-600" },
    "学校": { component: School, color: "text-yellow-600" },
    "行政": { component: Building, color: "text-gray-600" },
    "観光": { component: Plane, color: "text-pink-600" },
  };
  
  const iconData = iconMap[industry];
  if (iconData) {
    const IconComponent = iconData.component;
    return <IconComponent className={`h-4 w-4 ${iconData.color}`} />;
  }
  return <Factory className="h-4 w-4 text-blue-600" />;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadData[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  // ローカルストレージからリードデータを読み込み
  useEffect(() => {
    const savedLeads = localStorage.getItem('leads');
    if (savedLeads) {
      const parsedLeads = JSON.parse(savedLeads);
      setLeads(parsedLeads);
      setFilteredLeads(parsedLeads);
    }
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = leads;

    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter(lead => lead.priority === priorityFilter);
    }

    if (industryFilter !== "all") {
      filtered = filtered.filter(lead => lead.industry === industryFilter);
    }

    if (regionFilter !== "all") {
      filtered = filtered.filter(lead => lead.region === regionFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, statusFilter, priorityFilter, industryFilter, regionFilter]);

  const updateLead = (companyId: string, updates: Partial<LeadData>) => {
    const updatedLeads = leads.map(lead => 
      lead.companyId === companyId 
        ? { ...lead, ...updates, updatedAt: new Date().toISOString() }
        : lead
    );
    setLeads(updatedLeads);
    localStorage.setItem('leads', JSON.stringify(updatedLeads));
  };

  const deleteLead = (companyId: string) => {
    const updatedLeads = leads.filter(lead => lead.companyId !== companyId);
    setLeads(updatedLeads);
    localStorage.setItem('leads', JSON.stringify(updatedLeads));
  };

  const exportLeadsCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = ["企業名", "URL", "業界", "地域", "電話番号", "ステータス", "優先度", "担当者", "次回アクション", "追加日", "メモ"];
    const csvContent = [
      headers.join(","),
      ...filteredLeads.map((lead) =>
        [
          `"${lead.companyName.replace(/"/g, '""')}"`,
          `"${lead.url}"`,
          `"${lead.industry}"`,
          `"${lead.region}"`,
          `"${lead.phoneNumber || ''}"`,
          lead.status === 'new' ? '新規' :
           lead.status === 'contacted' ? 'コンタクト済' :
           lead.status === 'qualified' ? '見込み' :
           lead.status === 'proposal' ? '提案済' :
           lead.status === 'negotiation' ? '交渉中' :
           lead.status === 'closed_won' ? '成約' : '失注',
          lead.priority === 'high' ? '高' : lead.priority === 'medium' ? '中' : '低',
          `"${lead.assignedTo || ''}"`,
          `"${lead.nextAction || ''}"`,
          new Date(lead.createdAt).toLocaleDateString('ja-JP'),
          `"${lead.notes || ''}"`,
        ].join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `営業リスト_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'proposal': return 'bg-purple-100 text-purple-800';
      case 'negotiation': return 'bg-orange-100 text-orange-800';
      case 'closed_won': return 'bg-green-200 text-green-900';
      case 'closed_lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return '新規';
      case 'contacted': return 'コンタクト済';
      case 'qualified': return '見込み';
      case 'proposal': return '提案済';
      case 'negotiation': return '交渉中';
      case 'closed_won': return '成約';
      case 'closed_lost': return '失注';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  const openNotesEditor = (lead: LeadData) => {
    setEditingLeadId(lead.companyId);
    setEditingNotes(lead.notes || '');
  };

  const saveNotes = () => {
    if (editingLeadId && editingNotes !== null) {
      updateLead(editingLeadId, { notes: editingNotes });
      setEditingNotes(null);
      setEditingLeadId(null);
    }
  };

  const cancelNotesEdit = () => {
    setEditingNotes(null);
    setEditingLeadId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-[95vw] px-4">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">営業リスト管理</CardTitle>
                <CardDescription>
                  リードの進捗管理と営業活動の追跡
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    検索ページに戻る
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  ログアウト
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">業界</label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="業界を選択">
                      {industryFilter !== "all" && industryFilter ? (
                        <div className="flex items-center gap-2">
                          {getIndustryIcon(industryFilter)}
                          <span>{industryFilter}</span>
                        </div>
                      ) : (
                        "すべて"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        <div className="flex items-center gap-2">
                          {getIndustryIcon(industry)}
                          <span>{industry}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">地域・都道府県</label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="地域または都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">すべて</SelectItem>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">地域</div>
                    {regions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 mt-2">都道府県</div>
                    {prefectures.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ステータス</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="new">新規</SelectItem>
                    <SelectItem value="contacted">コンタクト済</SelectItem>
                    <SelectItem value="qualified">見込み</SelectItem>
                    <SelectItem value="proposal">提案済</SelectItem>
                    <SelectItem value="negotiation">交渉中</SelectItem>
                    <SelectItem value="closed_won">成約</SelectItem>
                    <SelectItem value="closed_lost">失注</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">優先度</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="優先度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={exportLeadsCSV} className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  CSVエクスポート
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              リード一覧 ({filteredLeads.length}件)
            </CardTitle>
            <CardDescription>
              営業ステータスと優先度で管理されているリード一覧
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                リードが登録されていません。
                <br />
                <Link href="/" className="text-blue-600 hover:underline">
                  検索ページで企業を検索してリードに追加してください
                </Link>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>企業名</TableHead>
                      <TableHead>業界</TableHead>
                      <TableHead>地域</TableHead>
                      <TableHead>電話番号</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>優先度</TableHead>
                      <TableHead>担当者</TableHead>
                <TableHead>次回アクション</TableHead>
                <TableHead>追加日</TableHead>
                <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.companyId}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{lead.companyName}</div>
                            <a
                              href={lead.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {lead.url.substring(0, 50)}...
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center" title={lead.industry}>
                            {getIndustryIcon(lead.industry)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                              {lead.region}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.phoneNumber ? (
                            <a
                              href={`tel:${lead.phoneNumber}`}
                              className="text-blue-600 hover:underline font-mono text-sm"
                            >
                              {lead.phoneNumber}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">未取得</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.status}
                            onValueChange={(value: any) => updateLead(lead.companyId, { status: value })}
                          >
                            <SelectTrigger className="w-32">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.status)}`}>
                                {getStatusLabel(lead.status)}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">新規</SelectItem>
                              <SelectItem value="contacted">コンタクト済</SelectItem>
                              <SelectItem value="qualified">見込み</SelectItem>
                              <SelectItem value="proposal">提案済</SelectItem>
                              <SelectItem value="negotiation">交渉中</SelectItem>
                              <SelectItem value="closed_won">成約</SelectItem>
                              <SelectItem value="closed_lost">失注</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.priority}
                            onValueChange={(value: any) => updateLead(lead.companyId, { priority: value })}
                          >
                            <SelectTrigger className="w-24">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                                {getPriorityLabel(lead.priority)}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">高</SelectItem>
                              <SelectItem value="medium">中</SelectItem>
                              <SelectItem value="low">低</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <input
                            type="text"
                            value={lead.assignedTo || ''}
                            onChange={(e) => updateLead(lead.companyId, { assignedTo: e.target.value })}
                            placeholder="担当者名"
                            className="w-32 px-2 py-1 border rounded text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={lead.nextAction || ''}
                              onChange={(e) => updateLead(lead.companyId, { nextAction: e.target.value })}
                              placeholder="次回アクション"
                              className="w-40 px-2 py-1 border rounded text-sm"
                            />
                            <input
                              type="date"
                              value={lead.nextActionDate || ''}
                              onChange={(e) => updateLead(lead.companyId, { nextActionDate: e.target.value })}
                              className="w-40 px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {new Date(lead.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {/* メモのプレビュー */}
                            {lead.notes && (
                              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs max-w-xs">
                                <div className="font-medium text-yellow-800 mb-1">メモ:</div>
                                <div className="text-yellow-700 whitespace-pre-wrap break-words overflow-hidden" style={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: '1.2em',
                                  maxHeight: '3.6em'
                                }}>
                                  {lead.notes}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <Button
                                variant={lead.notes ? "default" : "outline"}
                                size="sm"
                                onClick={() => openNotesEditor(lead)}
                                className={lead.notes ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {lead.notes ? "メモ編集" : "メモ追加"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm('このリードを削除しますか？')) {
                                    deleteLead(lead.companyId);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* メモ編集モーダル */}
        {editingNotes !== null && editingLeadId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <h3 className="text-lg font-semibold mb-4">メモ編集</h3>
              <textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="メモを入力してください（複数行可、文字数制限なし）"
                className="w-full h-64 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={cancelNotesEdit}>
                  キャンセル
                </Button>
                <Button onClick={saveNotes}>
                  保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
