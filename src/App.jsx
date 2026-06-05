import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Home, Building2, Users, BarChart2, Bell, Settings,
  Plus, Edit2, Trash2, ChevronRight, ChevronDown, X,
  Activity, AlertTriangle, Clock, AlertCircle, DollarSign,
  Briefcase, TrendingUp, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { supabase } from './supabase';

// ─── UTILITY ────────────────────────────────────────────────────────────────
const today = new Date();
const daysOffset = (d) => { const r = new Date(today); r.setDate(r.getDate() + d); return r; };
const fmt = (d) => d ? d.toISOString().slice(0, 10) : "";
const fmtRp = (n) => n >= 1e9 ? `Rp${(n/1e9).toFixed(1)}M` : n >= 1e6 ? `Rp${(n/1e6).toFixed(0)}Jt` : `Rp${n.toLocaleString()}`;

function calcStatus(mulai, deadline, graceDays, realisasi, target) {
  if (!mulai || !deadline) return "Belum Mulai";
  const now = new Date(); now.setHours(0,0,0,0);
  const m = new Date(mulai); const d = new Date(deadline);
  const gd = new Date(deadline); gd.setDate(gd.getDate() + (graceDays || 0));
  if (realisasi >= target && target > 0) return "Completed";
  if (now < m) return "Belum Mulai";
  if (now <= d) return "On Track";
  if (now <= gd) return "Grace Period";
  return "Overdue";
}

function calcCovenantStatus(realisasi, target) {
  if (!target) return "Terpenuhi";
  const pct = realisasi / target;
  if (pct >= 1) return "Terpenuhi";
  if (pct >= 0.75) return "Sebagian";
  return "Tidak Terpenuhi";
}

// ─── INITIAL STATE ───────────────────────────────────────────────────────────
const INIT_DIVISI = ["RM FT", "RM Briguna", "RM SME", "RM BRILife", "RM BRINS"];

const INIT_PRODUK = {
  "RM FT": ["Giro", "Deposito", "BRIVA", "Qlola/CMS", "EDC/QRIS", "BRImo Onboarding", "Bank Garansi", "Pengendapan CASA", "BRI Prioritas BOD/BOC"],
  "RM Briguna": ["PKS Payroll", "BRIguna", "Kartu Kredit", "KPR", "KKB", "DPLK"],
  "RM SME": ["KMK", "KI", "KUR", "SCF Accounts Payable", "SCF Accounts Receivable"],
  "RM BRILife": ["Asuransi Aurora", "Asuransi Jiwa Pijar"],
  "RM BRINS": ["Asuransi Alat Berat", "Asuransi Kendaraan", "Asuransi Kapal/Tugboat", "Asuransi Tongkang", "Asuransi Kargo", "Asuransi Properti"],
};

const INIT_COVENANT_TYPES = ["Minimum CASA Mengendap", "Target % Transaksi via BRI", "Mandatory Qlola", "Target % Payroll BRI"];

const KC_LIST = [
  "KC Samarinda Gajah Mada", "KC Samarinda II", "KC Balikpapan Sudirman",
  "KC Balikpapan A.Yani", "KC Bontang", "KC Sangata", "KC Tenggarong", "KC Tarakan"
];

// Seed RMs
const INIT_RM = {
  "KC Samarinda Gajah Mada": [
    { id: "r1", nama: "Khairunisa", divisi: "RM FT" },
    { id: "r2", nama: "Selvi", divisi: "RM Briguna" },
    { id: "r3", nama: "Agma", divisi: "RM BRILife" },
    { id: "r4", nama: "Yishak", divisi: "RM BRINS" },
    { id: "r5", nama: "Andri", divisi: "RM SME" },
  ],
  "KC Balikpapan Sudirman": [
    { id: "r6", nama: "Budi Santoso", divisi: "RM FT" },
    { id: "r7", nama: "Dewi Rahayu", divisi: "RM Briguna" },
    { id: "r8", nama: "Fajar Nugroho", divisi: "RM BRILife" },
    { id: "r9", nama: "Hendra Wijaya", divisi: "RM BRINS" },
    { id: "r10", nama: "Indah Permata", divisi: "RM SME" },
  ],
  "KC Balikpapan A.Yani": [
    { id: "r11", nama: "Joko Susilo", divisi: "RM FT" },
    { id: "r12", nama: "Kartika Sari", divisi: "RM Briguna" },
    { id: "r13", nama: "Luthfi Hakim", divisi: "RM BRILife" },
    { id: "r14", nama: "Maya Putri", divisi: "RM BRINS" },
    { id: "r15", nama: "Nanda Rizki", divisi: "RM SME" },
  ],
  "KC Samarinda II": [
    { id: "r16", nama: "Oscar Pratama", divisi: "RM FT" },
    { id: "r17", nama: "Putri Ayu", divisi: "RM Briguna" },
    { id: "r18", nama: "Rizal Fauzi", divisi: "RM BRILife" },
    { id: "r19", nama: "Sari Wulandari", divisi: "RM BRINS" },
    { id: "r20", nama: "Taufik Hidayat", divisi: "RM SME" },
  ],
  "KC Bontang": [
    { id: "r21", nama: "Umar Bakri", divisi: "RM FT" },
    { id: "r22", nama: "Vina Kusuma", divisi: "RM Briguna" },
    { id: "r23", nama: "Wahyu Adi", divisi: "RM BRILife" },
    { id: "r24", nama: "Yuni Astuti", divisi: "RM BRINS" },
    { id: "r25", nama: "Zainal Arifin", divisi: "RM SME" },
  ],
  "KC Sangata": [
    { id: "r26", nama: "Agus Salim", divisi: "RM FT" },
    { id: "r27", nama: "Bayu Anggara", divisi: "RM Briguna" },
    { id: "r28", nama: "Citra Dewi", divisi: "RM BRILife" },
    { id: "r29", nama: "Dani Permadi", divisi: "RM BRINS" },
    { id: "r30", nama: "Eka Surya", divisi: "RM SME" },
  ],
  "KC Tenggarong": [
    { id: "r31", nama: "Firman Syah", divisi: "RM FT" },
    { id: "r32", nama: "Gita Lestari", divisi: "RM Briguna" },
    { id: "r33", nama: "Hasan Basri", divisi: "RM BRILife" },
    { id: "r34", nama: "Ika Novita", divisi: "RM BRINS" },
    { id: "r35", nama: "Jupri Hadi", divisi: "RM SME" },
  ],
  "KC Tarakan": [
    { id: "r36", nama: "Kurnia Alam", divisi: "RM FT" },
    { id: "r37", nama: "Laila Sari", divisi: "RM Briguna" },
    { id: "r38", nama: "Mulyadi", divisi: "RM BRILife" },
    { id: "r39", nama: "Nurul Huda", divisi: "RM BRINS" },
    { id: "r40", nama: "Pandu Wicaksono", divisi: "RM SME" },
  ],
};

// Seed PT data
function mkProduk(arr) {
  return arr.map((p, i) => ({ ...p, id: `p${Date.now()}${i}${Math.random().toString(36).slice(2)}` }));
}

const INIT_PT = [
  {
    id: "pt1", nama: "PT Mitra Abadi Mahakam", kc: "KC Samarinda Gajah Mada",
    sektor: "Pertambangan", kickoff: fmt(daysOffset(-90)),
    relasi: [
      {
        id: "rel1", namaEntitas: "PT Mitra Abadi Mahakam", jenisRelasi: "Anchor",
        produk: mkProduk([
          { nama: "Payroll PKS (282 karyawan)", divisi: "RM FT", pic: "Khairunisa", target: 2000000000, realisasi: 483000000, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(30)), sla: 60, grace: 14, catatan: "" },
          { nama: "BRI Prioritas BOD/BOC", divisi: "RM FT", pic: "Khairunisa", target: 4000000000, realisasi: 0, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(30)), sla: 30, grace: 7, catatan: "" },
          { nama: "Pengendapan CASA (target Rp30M)", divisi: "RM FT", pic: "Khairunisa", target: 30000000000, realisasi: 10000000000, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(60)), sla: 90, grace: 14, catatan: "" },
          { nama: "EDC/QRIS Operasional", divisi: "RM FT", pic: "Khairunisa", target: 50000000, realisasi: 50000000, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(-60)), sla: 14, grace: 5, catatan: "" },
          { nama: "Qlola/CMS Aktif MAM+LBA+AJA", divisi: "RM FT", pic: "Khairunisa", target: 1, realisasi: 1, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(-30)), sla: 30, grace: 7, catatan: "" },
          { nama: "PKS Payroll (282 karyawan buka rekening)", divisi: "RM Briguna", pic: "Selvi", target: 500000000, realisasi: 150000000, mulai: fmt(daysOffset(-60)), deadline: fmt(daysOffset(45)), sla: 45, grace: 10, catatan: "" },
          { nama: "Asuransi Aurora (BOD/BOC)", divisi: "RM BRILife", pic: "Agma", target: 120000000, realisasi: 0, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(-2)), sla: 30, grace: 7, catatan: "" },
          { nama: "Asuransi Jiwa Pijar (karyawan)", divisi: "RM BRILife", pic: "Agma", target: 90000000, realisasi: 0, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(-5)), sla: 21, grace: 7, catatan: "" },
        ])
      },
      {
        id: "rel2", namaEntitas: "PT Anggana Jaya Abadi", jenisRelasi: "Anak Perusahaan",
        produk: mkProduk([
          { nama: "KMK Operasional Galangan", divisi: "RM SME", pic: "Andri", target: 5000000000, realisasi: 0, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(60)), sla: 60, grace: 14, catatan: "" },
          { nama: "Payroll 34 karyawan AJA", divisi: "RM FT", pic: "Khairunisa", target: 180000000, realisasi: 180000000, mulai: fmt(daysOffset(-60)), deadline: fmt(daysOffset(-30)), sla: 30, grace: 7, catatan: "" },
        ])
      },
      {
        id: "rel3", namaEntitas: "PT Lintas Bahtera Abadi", jenisRelasi: "Anak Perusahaan",
        produk: mkProduk([
          { nama: "Asuransi Kapal Tugboat", divisi: "RM BRINS", pic: "Yishak", target: 85000000, realisasi: 85000000, mulai: fmt(daysOffset(-75)), deadline: fmt(daysOffset(-45)), sla: 21, grace: 7, catatan: "" },
          { nama: "Asuransi Tongkang", divisi: "RM BRINS", pic: "Yishak", target: 110000000, realisasi: 0, mulai: fmt(daysOffset(-45)), deadline: fmt(daysOffset(-15)), sla: 21, grace: 7, catatan: "" },
          { nama: "Payroll 39 karyawan LBA", divisi: "RM FT", pic: "Khairunisa", target: 332000000, realisasi: 332000000, mulai: fmt(daysOffset(-75)), deadline: fmt(daysOffset(-45)), sla: 30, grace: 7, catatan: "" },
        ])
      },
      {
        id: "rel4", namaEntitas: "PT AKR Corporindo", jenisRelasi: "Supplier",
        produk: mkProduk([
          { nama: "SCF Accounts Payable", divisi: "RM SME", pic: "Andri", target: 25000000000, realisasi: 0, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(90)), sla: 60, grace: 14, catatan: "" },
        ])
      },
      {
        id: "rel5", namaEntitas: "PT Bukit Baiduri Energi", jenisRelasi: "Buyer",
        produk: mkProduk([
          { nama: "SCF Accounts Receivable", divisi: "RM SME", pic: "Andri", target: 10000000000, realisasi: 0, mulai: fmt(daysOffset(-20)), deadline: fmt(daysOffset(90)), sla: 60, grace: 14, catatan: "" },
        ])
      },
    ],
    covenant: [
      { id: "cv1", jenis: "Minimum CASA Mengendap", target: 20000000, realisasi: 10000000, satuan: "Rp", periode: "Bulanan" },
      { id: "cv2", jenis: "Target % Transaksi via BRI", target: 70, realisasi: 45, satuan: "%", periode: "Bulanan" },
      { id: "cv3", jenis: "Mandatory Qlola", target: 1, realisasi: 1, satuan: "Ya/Tidak", periode: "Bulanan" },
      { id: "cv4", jenis: "Target % Payroll BRI", target: 80, realisasi: 24, satuan: "%", periode: "Bulanan" },
    ]
  },
  {
    id: "pt2", nama: "PT Sumber Anugrah Energi", kc: "KC Samarinda Gajah Mada",
    sektor: "BBM/Energi", kickoff: fmt(daysOffset(-60)),
    relasi: [
      {
        id: "rel6", namaEntitas: "PT Sumber Anugrah Energi", jenisRelasi: "Anchor",
        produk: mkProduk([
          { nama: "Giro Operasional", divisi: "RM FT", pic: "Khairunisa", target: 30000000000, realisasi: 150000000, mulai: fmt(daysOffset(-60)), deadline: fmt(daysOffset(60)), sla: 60, grace: 14, catatan: "" },
          { nama: "KMK DF", divisi: "RM SME", pic: "Andri", target: 15000000000, realisasi: 10000000000, mulai: fmt(daysOffset(-60)), deadline: fmt(daysOffset(30)), sla: 45, grace: 10, catatan: "" },
          { nama: "Payroll 50 karyawan", divisi: "RM FT", pic: "Khairunisa", target: 250000000, realisasi: 0, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(30)), sla: 30, grace: 7, catatan: "" },
          { nama: "Asuransi Kendaraan", divisi: "RM BRINS", pic: "Yishak", target: 50000000, realisasi: 50000000, mulai: fmt(daysOffset(-60)), deadline: fmt(daysOffset(-30)), sla: 14, grace: 5, catatan: "" },
          { nama: "BRIguna Karyawan", divisi: "RM Briguna", pic: "Selvi", target: 2500000000, realisasi: 0, mulai: fmt(daysOffset(-15)), deadline: fmt(daysOffset(60)), sla: 45, grace: 10, catatan: "" },
        ])
      }
    ],
    covenant: [
      { id: "cv5", jenis: "Minimum CASA Mengendap", target: 5000000000, realisasi: 150000000, satuan: "Rp", periode: "Bulanan" },
      { id: "cv6", jenis: "Target % Transaksi via BRI", target: 70, realisasi: 30, satuan: "%", periode: "Bulanan" },
    ]
  },
  {
    id: "pt3", nama: "PT Justin Bintang Samudera Mandiri", kc: "KC Balikpapan Sudirman",
    sektor: "BBM/Energi", kickoff: fmt(daysOffset(-120)),
    relasi: [
      {
        id: "rel7", namaEntitas: "PT Justin Bintang Samudera Mandiri", jenisRelasi: "Anchor",
        produk: mkProduk([
          { nama: "KMK/KI Armada", divisi: "RM SME", pic: "Indah Permata", target: 55000000000, realisasi: 15000000000, mulai: fmt(daysOffset(-120)), deadline: fmt(daysOffset(-30)), sla: 60, grace: 14, catatan: "" },
          { nama: "Payroll 110 karyawan", divisi: "RM FT", pic: "Budi Santoso", target: 550000000, realisasi: 550000000, mulai: fmt(daysOffset(-120)), deadline: fmt(daysOffset(-90)), sla: 30, grace: 7, catatan: "" },
          { nama: "Qlola/CMS", divisi: "RM FT", pic: "Budi Santoso", target: 1, realisasi: 1, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(-60)), sla: 21, grace: 5, catatan: "" },
          { nama: "Asuransi Kapal SPOB", divisi: "RM BRINS", pic: "Hendra Wijaya", target: 42800000, realisasi: 42800000, mulai: fmt(daysOffset(-90)), deadline: fmt(daysOffset(-60)), sla: 21, grace: 5, catatan: "" },
          { nama: "BRI Prioritas Dirut", divisi: "RM FT", pic: "Budi Santoso", target: 2000000000, realisasi: 2000000000, mulai: fmt(daysOffset(-120)), deadline: fmt(daysOffset(-90)), sla: 14, grace: 5, catatan: "" },
        ])
      }
    ],
    covenant: [
      { id: "cv7", jenis: "Minimum CASA Mengendap", target: 10000000000, realisasi: 13600000000, satuan: "Rp", periode: "Bulanan" },
      { id: "cv8", jenis: "Target % Payroll BRI", target: 80, realisasi: 100, satuan: "%", periode: "Bulanan" },
    ]
  },
  {
    id: "pt4", nama: "RS Dirgahayu Samarinda", kc: "KC Samarinda Gajah Mada",
    sektor: "Kesehatan", kickoff: fmt(daysOffset(-30)),
    relasi: [
      {
        id: "rel8", namaEntitas: "RS Dirgahayu Samarinda", jenisRelasi: "Anchor",
        produk: mkProduk([
          { nama: "Giro Operasional RS", divisi: "RM FT", pic: "Khairunisa", target: 2200000000, realisasi: 1470000000, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(60)), sla: 45, grace: 14, catatan: "" },
          { nama: "Payroll 200 karyawan", divisi: "RM FT", pic: "Khairunisa", target: 500000000, realisasi: 0, mulai: fmt(daysOffset(-15)), deadline: fmt(daysOffset(45)), sla: 30, grace: 7, catatan: "" },
          { nama: "EDC/QRIS Kasir RS", divisi: "RM FT", pic: "Khairunisa", target: 350000000, realisasi: 303000000, mulai: fmt(daysOffset(-30)), deadline: fmt(daysOffset(0)), sla: 30, grace: 7, catatan: "" },
          { nama: "Asuransi Aurora Pengurus", divisi: "RM BRILife", pic: "Agma", target: 16000000, realisasi: 0, mulai: fmt(daysOffset(-15)), deadline: fmt(daysOffset(45)), sla: 30, grace: 7, catatan: "" },
          { nama: "BRIguna 100 Karyawan", divisi: "RM Briguna", pic: "Selvi", target: 500000000, realisasi: 0, mulai: fmt(daysOffset(-10)), deadline: fmt(daysOffset(60)), sla: 45, grace: 10, catatan: "" },
        ])
      }
    ],
    covenant: [
      { id: "cv9", jenis: "Target % Transaksi via BRI", target: 60, realisasi: 45, satuan: "%", periode: "Bulanan" },
    ]
  },
  {
    id: "pt5", nama: "PT Pupuk Kaltim", kc: "KC Bontang",
    sektor: "Industri", kickoff: fmt(daysOffset(-150)),
    relasi: [
      {
        id: "rel9", namaEntitas: "PT Pupuk Kaltim", jenisRelasi: "Anchor",
        produk: mkProduk([
          { nama: "Giro & Deposito Korporat", divisi: "RM FT", pic: "Umar Bakri", target: 100000000000, realisasi: 80000000000, mulai: fmt(daysOffset(-150)), deadline: fmt(daysOffset(-30)), sla: 90, grace: 14, catatan: "" },
          { nama: "Payroll Karyawan", divisi: "RM FT", pic: "Umar Bakri", target: 5000000000, realisasi: 5000000000, mulai: fmt(daysOffset(-150)), deadline: fmt(daysOffset(-120)), sla: 30, grace: 7, catatan: "" },
          { nama: "Qlola/CMS Korporat", divisi: "RM FT", pic: "Umar Bakri", target: 1, realisasi: 1, mulai: fmt(daysOffset(-120)), deadline: fmt(daysOffset(-90)), sla: 21, grace: 5, catatan: "" },
          { nama: "KI Pengembangan Pabrik", divisi: "RM SME", pic: "Zainal Arifin", target: 200000000000, realisasi: 150000000000, mulai: fmt(daysOffset(-150)), deadline: fmt(daysOffset(30)), sla: 120, grace: 30, catatan: "" },
          { nama: "Bank Garansi Proyek", divisi: "RM FT", pic: "Umar Bakri", target: 50000000000, realisasi: 50000000000, mulai: fmt(daysOffset(-100)), deadline: fmt(daysOffset(-60)), sla: 30, grace: 7, catatan: "" },
        ])
      }
    ],
    covenant: [
      { id: "cv10", jenis: "Minimum CASA Mengendap", target: 50000000000, realisasi: 80000000000, satuan: "Rp", periode: "Bulanan" },
      { id: "cv11", jenis: "Target % Payroll BRI", target: 90, realisasi: 95, satuan: "%", periode: "Bulanan" },
    ]
  },
];

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  "Completed": "bg-blue-100 text-blue-700",
  "On Track": "bg-green-100 text-green-700",
  "Grace Period": "bg-yellow-100 text-yellow-700",
  "Overdue": "bg-red-100 text-red-700",
  "Belum Mulai": "bg-gray-100 text-gray-600",
  "Terpenuhi": "bg-green-100 text-green-700",
  "Sebagian": "bg-yellow-100 text-yellow-700",
  "Tidak Terpenuhi": "bg-red-100 text-red-700",
  "PIC Belum Assign": "bg-orange-100 text-orange-700",
};

const StatusBadge = ({ s }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>
);

// ─── MODAL / CONFIRM ─────────────────────────────────────────────────────────
function ConfirmDel({ msg, onYes, onNo }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <p className="text-gray-800 font-medium mb-4">{msg}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onNo} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">Batal</button>
          <button onClick={onYes} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm">Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcRMScore(rmNama, allPT) {
  let totalAssigned = 0, completed = 0, onTrack = 0, targetSum = 0, realisasiSum = 0;
  allPT.forEach(pt => pt.relasi.forEach(rel => rel.produk.forEach(p => {
    if (p.pic === rmNama) {
      totalAssigned++;
      const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
      if (st === "Completed") { completed++; onTrack++; }
      if (st === "On Track") onTrack++;
      targetSum += p.target || 0;
      realisasiSum += p.realisasi || 0;
    }
  })));
  if (!totalAssigned) return { score: 0, grade: "D" };
  const s1 = (completed / totalAssigned) * 40;
  const s2 = targetSum > 0 ? Math.min(realisasiSum / targetSum, 1) * 40 : 40;
  const s3 = (onTrack / totalAssigned) * 20;
  const score = Math.round(s1 + s2 + s3);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D";
  return { score, grade, totalAssigned, completed, onTrack, targetSum, realisasiSum };
}

function calcPTScore(pt) {
  const allProduk = pt.relasi.flatMap(r => r.produk);
  const cvs = pt.covenant;
  const cvTerpenuhi = cvs.filter(c => calcCovenantStatus(c.realisasi, c.target) === "Terpenuhi").length;
  const totalCV = cvs.length || 1;
  const totalProduk = allProduk.length || 1;
  const completed = allProduk.filter(p => calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target) === "Completed").length;
  const targetSum = allProduk.reduce((a, p) => a + (p.target || 0), 0);
  const realisasiSum = allProduk.reduce((a, p) => a + (p.realisasi || 0), 0);
  const s1 = (cvTerpenuhi / totalCV) * 50;
  const s2 = targetSum > 0 ? Math.min(realisasiSum / targetSum, 1) * 30 : 30;
  const s3 = (completed / totalProduk) * 20;
  const score = Math.round(s1 + s2 + s3);
  const health = score >= 70 ? "Sehat" : score >= 50 ? "Perlu Perhatian" : "Kritis";
  return { score, health };
}

// ─── OVERVIEW REGIONAL ────────────────────────────────────────────────────────
function Overview({ pts, selectedKC }) {
  const filtered = selectedKC === "Semua KC" ? pts : pts.filter(p => p.kc === selectedKC);
  const allProduk = filtered.flatMap(pt => pt.relasi.flatMap(r => r.produk));
  const totalTarget = allProduk.reduce((a, p) => a + (p.target || 0), 0);
  const totalReal = allProduk.reduce((a, p) => a + (p.realisasi || 0), 0);

  const statusDist = {};
  allProduk.forEach(p => {
    const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
    statusDist[st] = (statusDist[st] || 0) + 1;
  });
  const pieData = Object.entries(statusDist).map(([name, value]) => ({ name, value }));
  const COLORS = { "Completed": "#3b82f6", "On Track": "#22c55e", "Grace Period": "#eab308", "Overdue": "#ef4444", "Belum Mulai": "#9ca3af" };

  const kcData = KC_LIST.map(kc => {
    const kpts = pts.filter(p => p.kc === kc);
    const kprod = kpts.flatMap(pt => pt.relasi.flatMap(r => r.produk));
    const kt = kprod.reduce((a, p) => a + (p.target || 0), 0);
    const kr = kprod.reduce((a, p) => a + (p.realisasi || 0), 0);
    return { kc: kc.replace("KC ", ""), pct: kt > 0 ? Math.round((kr / kt) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total PT Terdaftar", val: filtered.length, icon: <Building2 size={20} />, color: "bg-blue-50 text-blue-700" },
          { label: "Total Produk Aktif", val: allProduk.length, icon: <Briefcase size={20} />, color: "bg-green-50 text-green-700" },
          { label: "Total Target", val: fmtRp(totalTarget), icon: <TrendingUp size={20} />, color: "bg-yellow-50 text-yellow-700" },
          { label: "Total Realisasi", val: fmtRp(totalReal), icon: <DollarSign size={20} />, color: "bg-purple-50 text-purple-700" },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${c.color} mb-3`}>{c.icon}</div>
            <div className="text-2xl font-bold text-gray-800">{c.val}</div>
            <div className="text-sm text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">% Pencapaian per KC</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kcData} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="kc" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="pct" fill="#003f88" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Distribusi Status Produk</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {pieData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || "#9ca3af"} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-700">Ranking KC berdasarkan % Realisasi</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            {["Rank", "KC", "Jumlah PT", "Total Target", "Total Realisasi", "% Realisasi"].map(h => (
              <th key={h} className="px-4 py-2 text-left text-gray-500 font-medium">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[...kcData].sort((a, b) => b.pct - a.pct).map((kc, i) => {
              const kpts = pts.filter(p => p.kc === `KC ${kc.kc}` || p.kc.endsWith(kc.kc));
              const kprod = kpts.flatMap(pt => pt.relasi.flatMap(r => r.produk));
              const kt = kprod.reduce((a, p) => a + (p.target || 0), 0);
              const kr = kprod.reduce((a, p) => a + (p.realisasi || 0), 0);
              return (
                <tr key={kc.kc} className={`border-t border-gray-50 ${i === 0 ? "bg-yellow-50" : ""}`}>
                  <td className="px-4 py-2 font-bold text-gray-600">#{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{kc.kc}</td>
                  <td className="px-4 py-2 text-gray-600">{kpts.length}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtRp(kt)}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtRp(kr)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${kc.pct}%` }} />
                      </div>
                      <span className="font-semibold text-gray-700 text-xs w-10">{kc.pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PRODUK FORM ─────────────────────────────────────────────────────────────
function ProdukForm({ init, divisiList, produkMap, rmList, onSave, onCancel }) {
  const [f, setF] = useState(init || { nama: "", divisi: divisiList[0] || "", pic: "", target: 0, realisasi: 0, mulai: "", deadline: "", sla: 30, grace: 7, catatan: "" });
  const [customNama, setCustomNama] = useState(false);

  const produkOptions = produkMap[f.divisi] || [];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Divisi RM</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.divisi}
            onChange={e => setF({ ...f, divisi: e.target.value, nama: "" })}>
            {divisiList.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Produk</label>
          {customNama ? (
            <div className="flex gap-2">
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.nama}
                onChange={e => setF({ ...f, nama: e.target.value })} placeholder="Nama produk..." />
              <button onClick={() => setCustomNama(false)} className="text-xs text-blue-600">Pilih</button>
            </div>
          ) : (
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.nama}
              onChange={e => { if (e.target.value === "__custom__") { setCustomNama(true); setF({ ...f, nama: "" }); } else setF({ ...f, nama: e.target.value }); }}>
              <option value="">-- Pilih Produk --</option>
              {produkOptions.map(p => <option key={p}>{p}</option>)}
              <option value="__custom__">Produk Lainnya (isi manual)</option>
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">PIC (RM)</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.pic}
            onChange={e => setF({ ...f, pic: e.target.value })}>
            <option value="">-- Pilih RM --</option>
            {rmList.map(r => <option key={r.id}>{r.nama}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Target Nilai (Rp)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.target}
            onChange={e => setF({ ...f, target: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Realisasi (Rp)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.realisasi}
            onChange={e => setF({ ...f, realisasi: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal Mulai</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.mulai}
            onChange={e => setF({ ...f, mulai: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Deadline</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.deadline}
            onChange={e => setF({ ...f, deadline: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">SLA (hari)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.sla}
            onChange={e => setF({ ...f, sla: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Grace Period (hari)</label>
          <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={f.grace}
            onChange={e => setF({ ...f, grace: Number(e.target.value) })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Catatan</label>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} value={f.catatan}
          onChange={e => setF({ ...f, catatan: e.target.value })} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Batal</button>
        <button onClick={() => onSave(f)} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Simpan</button>
      </div>
    </div>
  );
}

// ─── GANTT CHART ─────────────────────────────────────────────────────────────
function GanttChart({ produkList }) {
  if (!produkList.length) return <div className="text-gray-400 text-sm text-center py-8">Belum ada produk</div>;
  const dates = produkList.flatMap(p => [p.mulai, p.deadline].filter(Boolean)).map(d => new Date(d)).filter(d => !isNaN(d));
  if (!dates.length) return null;
  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates));
  const total = Math.max((maxD - minD) / 86400000, 1);
  const todayPct = Math.max(0, Math.min(100, ((today - minD) / 86400000 / total) * 100));
  const BAR_COLORS = { "Completed": "#3b82f6", "On Track": "#22c55e", "Grace Period": "#eab308", "Overdue": "#ef4444", "Belum Mulai": "#9ca3af" };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-x-auto">
      <div className="font-semibold text-gray-700 mb-3 text-sm">Timeline Produk</div>
      <div className="min-w-[500px]">
        {produkList.map((p) => {
          if (!p.mulai || !p.deadline) return null;
          const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
          const start = Math.max(0, ((new Date(p.mulai) - minD) / 86400000 / total) * 100);
          const width = Math.max(1, ((new Date(p.deadline) - new Date(p.mulai)) / 86400000 / total) * 100);
          return (
            <div key={p.id} className="flex items-center gap-2 mb-1.5">
              <div className="w-36 text-xs text-gray-600 truncate shrink-0" title={p.nama}>{p.nama}</div>
              <div className="flex-1 relative h-6 bg-gray-100 rounded">
                <div className="absolute h-full rounded" style={{ left: `${start}%`, width: `${width}%`, backgroundColor: BAR_COLORS[st] || "#9ca3af", opacity: 0.85 }} title={`${p.nama} | ${st}`} />
                <div className="absolute top-0 h-full w-px bg-red-500 z-10" style={{ left: `${todayPct}%` }} />
              </div>
              <StatusBadge s={st} />
            </div>
          );
        })}
        <div className="text-xs text-gray-400 mt-2 flex justify-between">
          <span>{fmt(minD)}</span>
          <span className="text-red-500">▲ Hari ini</span>
          <span>{fmt(maxD)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL PT ───────────────────────────────────────────────────────────────
function DetailPT({ pt, divisiList, produkMap, rmList, onUpdate, onBack, covenantTypes, onAddCovenantType }) {
  const [editInfo, setEditInfo] = useState(false);
  const [infoF, setInfoF] = useState({ nama: pt.nama, sektor: pt.sektor, kickoff: pt.kickoff });
  const [addRelasi, setAddRelasi] = useState(false);
  const [relasiF, setRelasiF] = useState({ namaEntitas: "", jenisRelasi: "Anchor" });
  const [expandedRel, setExpandedRel] = useState({});
  const [addProdukRel, setAddProdukRel] = useState(null);
  const [editProduk, setEditProduk] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [addCovenant, setAddCovenant] = useState(false);
  const [cvF, setCvF] = useState({ jenis: covenantTypes[0] || "", target: 0, realisasi: 0, satuan: "Rp", periode: "Bulanan", customJenis: "" });
  const [editCv, setEditCv] = useState(null);

  const allProduk = pt.relasi.flatMap(r => r.produk);
  const { score, health } = calcPTScore(pt);

  const uid = () => `id${Date.now()}${Math.random().toString(36).slice(2)}`;

  const saveInfo = () => {
    onUpdate({ ...pt, ...infoF });
    setEditInfo(false);
  };

  const saveRelasi = () => {
    const newRel = { id: uid(), ...relasiF, produk: [] };
    onUpdate({ ...pt, relasi: [...pt.relasi, newRel] });
    setAddRelasi(false);
    setRelasiF({ namaEntitas: "", jenisRelasi: "Anchor" });
  };

  const delRelasi = (relId) => {
    onUpdate({ ...pt, relasi: pt.relasi.filter(r => r.id !== relId) });
    setDelConfirm(null);
  };

  const saveProduk = (relId, produk) => {
    const newP = { ...produk, id: uid() };
    onUpdate({
      ...pt, relasi: pt.relasi.map(r => r.id === relId ? { ...r, produk: [...r.produk, newP] } : r)
    });
    setAddProdukRel(null);
  };

  const saveEditProduk = (relId, produk) => {
    onUpdate({
      ...pt, relasi: pt.relasi.map(r => r.id === relId ? {
        ...r, produk: r.produk.map(p => p.id === produk.id ? produk : p)
      } : r)
    });
    setEditProduk(null);
  };

  const delProduk = (relId, pid) => {
    onUpdate({
      ...pt, relasi: pt.relasi.map(r => r.id === relId ? { ...r, produk: r.produk.filter(p => p.id !== pid) } : r)
    });
    setDelConfirm(null);
  };

  const saveCovenant = () => {
    const finalJenis = cvF.jenis === "__custom__" ? cvF.customJenis : cvF.jenis;
    if (cvF.jenis === "__custom__" && cvF.customJenis) onAddCovenantType(cvF.customJenis);
    const newCv = { id: uid(), jenis: finalJenis, target: cvF.target, realisasi: cvF.realisasi, satuan: cvF.satuan, periode: cvF.periode };
    onUpdate({ ...pt, covenant: [...pt.covenant, newCv] });
    setAddCovenant(false);
    setCvF({ jenis: covenantTypes[0] || "", target: 0, realisasi: 0, satuan: "Rp", periode: "Bulanan", customJenis: "" });
  };

  const saveEditCovenant = (cv) => {
    onUpdate({ ...pt, covenant: pt.covenant.map(c => c.id === cv.id ? cv : c) });
    setEditCv(null);
  };

  const delCovenant = (cvId) => {
    onUpdate({ ...pt, covenant: pt.covenant.filter(c => c.id !== cvId) });
    setDelConfirm(null);
  };

  return (
    <div className="space-y-5">
      {delConfirm && <ConfirmDel msg={delConfirm.msg} onYes={delConfirm.onYes} onNo={() => setDelConfirm(null)} />}

      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
          <ChevronRight size={16} className="rotate-180" /> Kembali
        </button>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-800">{pt.nama}</span>
      </div>

      {/* Info PT */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{pt.nama}</h2>
            <div className="text-sm text-gray-500">{pt.kc} · {pt.sektor} · Kick-off: {pt.kickoff}</div>
          </div>
          <div className="flex gap-2 items-center">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${health === "Sehat" ? "bg-green-100 text-green-700" : health === "Perlu Perhatian" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
              {health} ({score}%)
            </div>
            <button onClick={() => setEditInfo(!editInfo)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 size={15} /></button>
          </div>
        </div>
        {editInfo && (
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nama PT</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={infoF.nama} onChange={e => setInfoF({ ...infoF, nama: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Sektor</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={infoF.sektor} onChange={e => setInfoF({ ...infoF, sektor: e.target.value })}>
                  {["Pertambangan", "BBM/Energi", "Kesehatan", "Pendidikan", "Angkutan/Logistik", "Industri", "Lainnya"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Kick-off</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={infoF.kickoff} onChange={e => setInfoF({ ...infoF, kickoff: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditInfo(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Batal</button>
              <button onClick={saveInfo} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        )}
      </div>

      {/* Gantt */}
      <GanttChart produkList={allProduk} />

      {/* Relasi */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Relasi & Produk</h3>
          <button onClick={() => setAddRelasi(!addRelasi)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah Relasi
          </button>
        </div>

        {addRelasi && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Entitas</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={relasiF.namaEntitas}
                  onChange={e => setRelasiF({ ...relasiF, namaEntitas: e.target.value })} placeholder="Nama perusahaan..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Jenis Relasi</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={relasiF.jenisRelasi}
                  onChange={e => setRelasiF({ ...relasiF, jenisRelasi: e.target.value })}>
                  {["Anchor", "Anak Perusahaan", "Supplier", "Buyer"].map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddRelasi(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Batal</button>
              <button onClick={saveRelasi} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        )}

        {pt.relasi.map(rel => (
          <div key={rel.id} className="border border-gray-100 rounded-xl mb-3">
            <div className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl"
              onClick={() => setExpandedRel(e => ({ ...e, [rel.id]: !e[rel.id] }))}>
              <div className="flex items-center gap-2">
                {expandedRel[rel.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-medium text-gray-800">{rel.namaEntitas}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{rel.jenisRelasi}</span>
                <span className="text-xs text-gray-400">{rel.produk.length} produk</span>
              </div>
              <button onClick={e => { e.stopPropagation(); setDelConfirm({ msg: `Hapus relasi ${rel.namaEntitas}?`, onYes: () => delRelasi(rel.id) }); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>

            {expandedRel[rel.id] && (
              <div className="px-4 pb-4 space-y-2">
                {rel.produk.map(p => {
                  const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
                  return (
                    <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      {editProduk?.id === p.id ? (
                        <div className="flex-1">
                          <ProdukForm init={editProduk} divisiList={divisiList} produkMap={produkMap} rmList={rmList}
                            onSave={(updated) => saveEditProduk(rel.id, { ...updated, id: p.id })}
                            onCancel={() => setEditProduk(null)} />
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate">{p.nama}</div>
                            <div className="text-xs text-gray-500">{p.divisi} · {p.pic || "PIC Belum Assign"} · Target: {fmtRp(p.target)} · Real: {fmtRp(p.realisasi)}</div>
                          </div>
                          <StatusBadge s={st} />
                          <button onClick={() => setEditProduk(p)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit2 size={13} /></button>
                          <button onClick={() => setDelConfirm({ msg: `Hapus produk ${p.nama}?`, onYes: () => delProduk(rel.id, p.id) })}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  );
                })}

                {addProdukRel === rel.id ? (
                  <ProdukForm divisiList={divisiList} produkMap={produkMap} rmList={rmList}
                    onSave={(p) => saveProduk(rel.id, p)}
                    onCancel={() => setAddProdukRel(null)} />
                ) : (
                  <button onClick={() => setAddProdukRel(rel.id)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mt-1">
                    <Plus size={14} /> Tambah Produk
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Covenant */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Covenant Nasabah</h3>
          <button onClick={() => setAddCovenant(!addCovenant)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah Covenant
          </button>
        </div>

        {addCovenant && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Jenis Covenant</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cvF.jenis}
                  onChange={e => setCvF({ ...cvF, jenis: e.target.value })}>
                  {covenantTypes.map(c => <option key={c}>{c}</option>)}
                  <option value="__custom__">Jenis Lainnya (isi manual)</option>
                </select>
                {cvF.jenis === "__custom__" && (
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2" placeholder="Nama jenis covenant..."
                    value={cvF.customJenis} onChange={e => setCvF({ ...cvF, customJenis: e.target.value })} />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Satuan</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cvF.satuan}
                  onChange={e => setCvF({ ...cvF, satuan: e.target.value })}>
                  {["Rp", "%", "Ya/Tidak", "Jumlah"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Target</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cvF.target}
                  onChange={e => setCvF({ ...cvF, target: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Realisasi</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cvF.realisasi}
                  onChange={e => setCvF({ ...cvF, realisasi: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Periode Evaluasi</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={cvF.periode}
                  onChange={e => setCvF({ ...cvF, periode: e.target.value })}>
                  {["Bulanan", "Triwulan", "Semesteran"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddCovenant(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Batal</button>
              <button onClick={saveCovenant} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            {["Jenis", "Target", "Realisasi", "Periode", "Status", "Aksi"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium text-xs">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pt.covenant.map(cv => {
              const st = calcCovenantStatus(cv.realisasi, cv.target);
              return (
                <tr key={cv.id} className="border-t border-gray-50">
                  {editCv?.id === cv.id ? (
                    <td colSpan={6} className="px-3 py-2">
                      <div className="grid grid-cols-4 gap-2">
                        <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={editCv.jenis} onChange={e => setEditCv({ ...editCv, jenis: e.target.value })} />
                        <input type="number" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={editCv.target} onChange={e => setEditCv({ ...editCv, target: Number(e.target.value) })} />
                        <input type="number" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={editCv.realisasi} onChange={e => setEditCv({ ...editCv, realisasi: Number(e.target.value) })} />
                        <div className="flex gap-2">
                          <button onClick={() => saveEditCovenant(editCv)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">Simpan</button>
                          <button onClick={() => setEditCv(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600">Batal</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-gray-800">{cv.jenis}</td>
                      <td className="px-3 py-2 text-gray-600">{cv.target} {cv.satuan}</td>
                      <td className="px-3 py-2 text-gray-600">{cv.realisasi} {cv.satuan}</td>
                      <td className="px-3 py-2 text-gray-500">{cv.periode}</td>
                      <td className="px-3 py-2"><StatusBadge s={st} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => setEditCv(cv)} className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit2 size={13} /></button>
                          <button onClick={() => setDelConfirm({ msg: `Hapus covenant ${cv.jenis}?`, onYes: () => delCovenant(cv.id) })}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MANAJEMEN EKOSISTEM ──────────────────────────────────────────────────────
function Ekosistem({ pts, selectedKC, divisiList, produkMap, rmAll, onPTsChange, covenantTypes, onAddCovenantType }) {
  const [detailPT, setDetailPT] = useState(null);
  const [addPT, setAddPT] = useState(false);
  const [ptF, setPtF] = useState({ nama: "", sektor: "Pertambangan", kickoff: fmt(today) });
  const [delConfirm, setDelConfirm] = useState(null);

  const filtered = selectedKC === "Semua KC" ? pts : pts.filter(p => p.kc === selectedKC);
  const rmList = rmAll[selectedKC === "Semua KC" ? "KC Samarinda Gajah Mada" : selectedKC] || [];

  const uid = () => `pt${Date.now()}${Math.random().toString(36).slice(2)}`;

  const savePT = () => {
    const newPT = { id: uid(), ...ptF, kc: selectedKC === "Semua KC" ? KC_LIST[0] : selectedKC, relasi: [], covenant: [] };
    onPTsChange([...pts, newPT], newPT, false);
    setAddPT(false);
    setPtF({ nama: "", sektor: "Pertambangan", kickoff: fmt(today) });
  };

  const updatePT = (updated) => {
    onPTsChange(pts.map(p => p.id === updated.id ? updated : p), updated, false);
    if (detailPT?.id === updated.id) setDetailPT(updated);
  };

  const delPT = (id) => {
    const ptToDelete = pts.find(p => p.id === id);
    onPTsChange(pts.filter(p => p.id !== id), ptToDelete, true);
    setDelConfirm(null);
  };

  if (detailPT) {
    const current = pts.find(p => p.id === detailPT.id) || detailPT;
    return <DetailPT pt={current} divisiList={divisiList} produkMap={produkMap} rmList={rmList}
      onUpdate={updatePT} onBack={() => setDetailPT(null)}
      covenantTypes={covenantTypes} onAddCovenantType={onAddCovenantType} />;
  }

  return (
    <div className="space-y-5">
      {delConfirm && <ConfirmDel msg={delConfirm.msg} onYes={delConfirm.onYes} onNo={() => setDelConfirm(null)} />}
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-800 text-lg">Manajemen Ekosistem</h2>
        <button onClick={() => setAddPT(!addPT)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
          <Plus size={15} /> Tambah PT
        </button>
      </div>

      {addPT && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nama PT</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ptF.nama}
                onChange={e => setPtF({ ...ptF, nama: e.target.value })} placeholder="PT ..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Sektor Usaha</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ptF.sektor}
                onChange={e => setPtF({ ...ptF, sektor: e.target.value })}>
                {["Pertambangan", "BBM/Energi", "Kesehatan", "Pendidikan", "Angkutan/Logistik", "Industri", "Lainnya"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tanggal Kick-off</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={ptF.kickoff}
                onChange={e => setPtF({ ...ptF, kickoff: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAddPT(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Batal</button>
            <button onClick={savePT} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Nama PT", "Sektor", "KC", "Kick-off", "Produk", "% Realisasi", "Skor", "Aksi"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(pt => {
              const allProduk = pt.relasi.flatMap(r => r.produk);
              const target = allProduk.reduce((a, p) => a + (p.target || 0), 0);
              const real = allProduk.reduce((a, p) => a + (p.realisasi || 0), 0);
              const pct = target > 0 ? Math.round((real / target) * 100) : 0;
              const { score, health } = calcPTScore(pt);
              return (
                <tr key={pt.id} className="border-t border-gray-50 hover:bg-blue-50 cursor-pointer"
                  onClick={() => setDetailPT(pt)}>
                  <td className="px-4 py-3 font-medium text-blue-700">{pt.nama}</td>
                  <td className="px-4 py-3 text-gray-600">{pt.sektor}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{pt.kc}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{pt.kickoff}</td>
                  <td className="px-4 py-3 text-gray-600">{allProduk.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-600">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${health === "Sehat" ? "text-green-600" : health === "Perlu Perhatian" ? "text-yellow-600" : "text-red-600"}`}>{score}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setDelConfirm({ msg: `Hapus ${pt.nama}?`, onYes: () => delPT(pt.id) }); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">Belum ada PT untuk {selectedKC}. Klik "+ Tambah PT" untuk menambahkan.</div>
        )}
      </div>
    </div>
  );
}

// ─── PERFORMA RM ─────────────────────────────────────────────────────────────
function PerformaRM({ pts, rmAll, divisiList, selectedKC, onRMChange }) {
  const [addRM, setAddRM] = useState(false);
  const [rmF, setRmF] = useState({ nama: "", divisi: divisiList[0] || "" });
  const [editRM, setEditRM] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [filterKC, setFilterKC] = useState(selectedKC === "Semua KC" ? KC_LIST[0] : selectedKC);
  const [filterDivisi, setFilterDivisi] = useState("Semua");
  const [filterGrade, setFilterGrade] = useState("Semua");

  const uid = () => `r${Date.now()}${Math.random().toString(36).slice(2)}`;

  const currentRMs = rmAll[filterKC] || [];

  const saveRM = () => {
    const newRM = { id: uid(), ...rmF };
    const updated = { ...rmAll, [filterKC]: [...(rmAll[filterKC] || []), newRM] };
    onRMChange(updated);
    setAddRM(false);
    setRmF({ nama: "", divisi: divisiList[0] || "" });
  };

  const saveEditRM = (rm) => {
    const updated = { ...rmAll, [filterKC]: (rmAll[filterKC] || []).map(r => r.id === rm.id ? rm : r) };
    onRMChange(updated);
    setEditRM(null);
  };

  const delRM = (id) => {
    const updated = { ...rmAll, [filterKC]: (rmAll[filterKC] || []).filter(r => r.id !== id) };
    onRMChange(updated);
    setDelConfirm(null);
  };

  const filteredRMs = currentRMs.filter(r =>
    (filterDivisi === "Semua" || r.divisi === filterDivisi) &&
    (filterGrade === "Semua" || calcRMScore(r.nama, pts).grade === filterGrade)
  );

  const scoreData = filteredRMs.map(r => ({ name: r.nama, score: calcRMScore(r.nama, pts).score }));

  return (
    <div className="space-y-5">
      {delConfirm && <ConfirmDel msg={delConfirm.msg} onYes={delConfirm.onYes} onNo={() => setDelConfirm(null)} />}

      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-800 text-lg">Performa RM</h2>
        <button onClick={() => setAddRM(!addRM)} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
          <Plus size={15} /> Tambah RM
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterKC} onChange={e => setFilterKC(e.target.value)}>
          {KC_LIST.map(k => <option key={k}>{k}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}>
          <option>Semua</option>
          {divisiList.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          {["Semua", "A", "B", "C", "D"].map(g => <option key={g}>{g}</option>)}
        </select>
      </div>

      {addRM && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nama RM</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={rmF.nama}
                onChange={e => setRmF({ ...rmF, nama: e.target.value })} placeholder="Nama lengkap..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Divisi</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={rmF.divisi}
                onChange={e => setRmF({ ...rmF, divisi: e.target.value })}>
                {divisiList.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAddRM(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Batal</button>
            <button onClick={saveRM} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
          </div>
        </div>
      )}

      {scoreData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Perbandingan Skor RM</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="score" fill="#003f88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            {["Nama RM", "Divisi", "KC", "Produk", "Completed", "Skor", "Grade", "Aksi"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium text-xs">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filteredRMs.map(rm => {
              const { score, grade, totalAssigned, completed } = calcRMScore(rm.nama, pts);
              const GRADE_COLOR = { A: "text-green-700 bg-green-100", B: "text-blue-700 bg-blue-100", C: "text-yellow-700 bg-yellow-100", D: "text-red-700 bg-red-100" };
              return (
                <tr key={rm.id} className="border-t border-gray-50">
                  {editRM?.id === rm.id ? (
                    <td colSpan={8} className="px-4 py-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editRM.nama} onChange={e => setEditRM({ ...editRM, nama: e.target.value })} />
                        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editRM.divisi} onChange={e => setEditRM({ ...editRM, divisi: e.target.value })}>
                          {divisiList.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditRM(editRM)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs">Simpan</button>
                          <button onClick={() => setEditRM(null)} className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600">Batal</button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-800">{rm.nama}</td>
                      <td className="px-4 py-3 text-gray-600">{rm.divisi}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{filterKC}</td>
                      <td className="px-4 py-3 text-gray-600">{totalAssigned}</td>
                      <td className="px-4 py-3 text-gray-600">{completed}</td>
                      <td className="px-4 py-3 font-bold text-gray-700">{score}%</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${GRADE_COLOR[grade]}`}>{grade}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setEditRM(rm)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit2 size={13} /></button>
                          <button onClick={() => setDelConfirm({ msg: `Hapus RM ${rm.nama}?`, onYes: () => delRM(rm.id) })}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PERFORMA NASABAH ─────────────────────────────────────────────────────────
function PerfomaNasabah({ pts, selectedKC }) {
  const filtered = selectedKC === "Semua KC" ? pts : pts.filter(p => p.kc === selectedKC);

  const scoreData = filtered.map(pt => {
    const { score } = calcPTScore(pt);
    return { name: pt.nama.replace("PT ", "").slice(0, 20), score };
  });

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-gray-800 text-lg">Performa Nasabah</h2>

      {scoreData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Perbandingan Skor PT</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="score" fill="#f5a623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map(pt => {
          const allProduk = pt.relasi.flatMap(r => r.produk);
          const { score, health } = calcPTScore(pt);
          const cvTerpenuhi = pt.covenant.filter(c => calcCovenantStatus(c.realisasi, c.target) === "Terpenuhi").length;
          const completed = allProduk.filter(p => calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target) === "Completed").length;
          const target = allProduk.reduce((a, p) => a + (p.target || 0), 0);
          const real = allProduk.reduce((a, p) => a + (p.realisasi || 0), 0);
          const pct = target > 0 ? Math.round((real / target) * 100) : 0;

          return (
            <div key={pt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{pt.nama}</h3>
                  <span className="text-xs text-gray-500">{pt.kc} · {pt.sektor}</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${health === "Sehat" ? "bg-green-100 text-green-700" : health === "Perlu Perhatian" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                  {health} ({score}%)
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Skor PT", val: `${score}%` },
                  { label: "Covenant Terpenuhi", val: `${cvTerpenuhi}/${pt.covenant.length}` },
                  { label: "% Realisasi", val: `${pct}%` },
                  { label: "Produk Selesai", val: `${completed}/${allProduk.length}` },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gray-800">{item.val}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ALERT & COVENANT ─────────────────────────────────────────────────────────
function AlertCovenant({ pts, selectedKC }) {
  const [dismissed, setDismissed] = useState(new Set());
  const filtered = selectedKC === "Semua KC" ? pts : pts.filter(p => p.kc === selectedKC);

  const overdue = [], grace = [], cvFail = [];
  filtered.forEach(pt => {
    pt.relasi.forEach(rel => rel.produk.forEach(p => {
      const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
      const key = `${pt.id}-${p.id}`;
      if (!dismissed.has(key)) {
        if (st === "Overdue") overdue.push({ pt, p, rel, key });
        if (st === "Grace Period") grace.push({ pt, p, rel, key });
      }
    }));
    pt.covenant.forEach(cv => {
      const st = calcCovenantStatus(cv.realisasi, cv.target);
      const key = `cv-${pt.id}-${cv.id}`;
      if (!dismissed.has(key) && st !== "Terpenuhi") cvFail.push({ pt, cv, st, key });
    });
  });

  const Section = ({ title, items, icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${color}`}>
        {icon}
        <span className="font-semibold text-sm">{title} ({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">Tidak ada alert</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.key} className="px-5 py-3 flex justify-between items-start">
              <div>
                <div className="font-medium text-gray-800 text-sm">{item.p?.nama || item.cv?.jenis}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.pt.nama}
                  {item.rel && ` · ${item.rel.namaEntitas}`}
                  {item.cv && ` · Realisasi: ${item.cv.realisasi} / Target: ${item.cv.target} · ${item.st}`}
                </div>
              </div>
              <button onClick={() => setDismissed(d => new Set([...d, item.key]))}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 ml-4 shrink-0"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-gray-800 text-lg">Alert & Covenant</h2>
      <Section title="Produk Overdue" items={overdue} icon={<AlertTriangle size={16} className="text-red-600" />} color="border-b border-red-100 bg-red-50 text-red-800" />
      <Section title="Produk Grace Period" items={grace} icon={<Clock size={16} className="text-yellow-600" />} color="border-b border-yellow-100 bg-yellow-50 text-yellow-800" />
      <Section title="Covenant Tidak/Sebagian Terpenuhi" items={cvFail} icon={<AlertCircle size={16} className="text-orange-600" />} color="border-b border-orange-100 bg-orange-50 text-orange-800" />
    </div>
  );
}

// ─── PENGATURAN REFERENSI ─────────────────────────────────────────────────────
function Pengaturan({ divisiList, setDivisiList, produkMap, setProdukMap, covenantTypes, setCovenantTypes }) {
  const [newDivisi, setNewDivisi] = useState("");
  const [editDivisi, setEditDivisi] = useState(null);
  const [newProduk, setNewProduk] = useState({});
  const [newCovType, setNewCovType] = useState("");
  const [editCovType, setEditCovType] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const addDivisi = () => {
    if (!newDivisi.trim()) return;
    setDivisiList([...divisiList, newDivisi.trim()]);
    setProdukMap({ ...produkMap, [newDivisi.trim()]: [] });
    setNewDivisi("");
  };

  const delDivisi = (d) => {
    setDivisiList(divisiList.filter(x => x !== d));
    const { [d]: _, ...rest } = produkMap;
    setProdukMap(rest);
    setDelConfirm(null);
  };

  const addProdukToDivisi = (divisi) => {
    const nama = (newProduk[divisi] || "").trim();
    if (!nama) return;
    setProdukMap({ ...produkMap, [divisi]: [...(produkMap[divisi] || []), nama] });
    setNewProduk({ ...newProduk, [divisi]: "" });
  };

  const delProduk = (divisi, p) => {
    setProdukMap({ ...produkMap, [divisi]: produkMap[divisi].filter(x => x !== p) });
    setDelConfirm(null);
  };

  const addCovType = () => {
    if (!newCovType.trim()) return;
    setCovenantTypes([...covenantTypes, newCovType.trim()]);
    setNewCovType("");
  };

  return (
    <div className="space-y-6">
      {delConfirm && <ConfirmDel msg={delConfirm.msg} onYes={delConfirm.onYes} onNo={() => setDelConfirm(null)} />}
      <h2 className="font-bold text-gray-800 text-lg">Pengaturan Referensi</h2>

      {/* Divisi RM */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Manajemen Divisi RM</h3>
        <div className="space-y-2 mb-4">
          {divisiList.map(d => (
            <div key={d} className="flex items-center gap-2">
              {editDivisi?.old === d ? (
                <>
                  <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editDivisi.val}
                    onChange={e => setEditDivisi({ ...editDivisi, val: e.target.value })} />
                  <button onClick={() => {
                    const newList = divisiList.map(x => x === d ? editDivisi.val : x);
                    setDivisiList(newList);
                    const newMap = {};
                    Object.entries(produkMap).forEach(([k, v]) => { newMap[k === d ? editDivisi.val : k] = v; });
                    setProdukMap(newMap);
                    setEditDivisi(null);
                  }} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs">Simpan</button>
                  <button onClick={() => setEditDivisi(null)} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs">Batal</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{d}</span>
                  <button onClick={() => setEditDivisi({ old: d, val: d })} className="p-2 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => setDelConfirm({ msg: `Hapus divisi ${d}? Produk terkait akan kehilangan referensi.`, onYes: () => delDivisi(d) })}
                    className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newDivisi}
            onChange={e => setNewDivisi(e.target.value)} placeholder="Nama divisi baru..." />
          <button onClick={addDivisi} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {/* Produk per Divisi */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Manajemen Produk per Divisi</h3>
        <div className="space-y-5">
          {divisiList.map(d => (
            <div key={d} className="border border-gray-100 rounded-xl p-4">
              <h4 className="font-medium text-gray-700 mb-3 text-sm">{d}</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {(produkMap[d] || []).map(p => (
                  <div key={p} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                    {p}
                    <button onClick={() => setDelConfirm({ msg: `Hapus produk ${p} dari ${d}?`, onYes: () => delProduk(d, p) })}
                      className="hover:text-red-500 ml-1"><X size={11} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" value={newProduk[d] || ""}
                  onChange={e => setNewProduk({ ...newProduk, [d]: e.target.value })} placeholder="Nama produk baru..." />
                <button onClick={() => addProdukToDivisi(d)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                  <Plus size={12} /> Tambah
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Jenis Covenant */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Manajemen Jenis Covenant</h3>
        <div className="space-y-2 mb-4">
          {covenantTypes.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {editCovType?.i === i ? (
                <>
                  <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={editCovType.val}
                    onChange={e => setEditCovType({ ...editCovType, val: e.target.value })} />
                  <button onClick={() => {
                    setCovenantTypes(covenantTypes.map((x, j) => j === i ? editCovType.val : x));
                    setEditCovType(null);
                  }} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs">Simpan</button>
                  <button onClick={() => setEditCovType(null)} className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs">Batal</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{c}</span>
                  <button onClick={() => setEditCovType({ i, val: c })} className="p-2 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500"><Edit2 size={14} /></button>
                  <button onClick={() => setCovenantTypes(covenantTypes.filter((_, j) => j !== i))}
                    className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" value={newCovType}
            onChange={e => setNewCovType(e.target.value)} placeholder="Jenis covenant baru..." />
          <button onClick={addCovType} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [pts, setPts] = useState([]);
const [divisiList, setDivisiList] = useState(INIT_DIVISI);
const [produkMap, setProdukMap] = useState(INIT_PRODUK);
const [covenantTypes, setCovenantTypes] = useState(INIT_COVENANT_TYPES);
const [rmAll, setRmAll] = useState(INIT_RM);
const [loading, setLoading] = useState(true);
const [syncing, setSyncing] = useState(false);
const [online, setOnline] = useState(true);
const [selectedKC, setSelectedKC] = useState("Semua KC");
const [activeMenu, setActiveMenu] = useState("overview");

// ── LOAD DATA DARI SUPABASE SAAT PERTAMA BUKA ──
useEffect(() => {
  loadAllData();
}, []);

const loadAllData = async () => {
  setLoading(true);
  try {
    // Load PT
    const { data: ptData } = await supabase
      .from('pt_nasabah')
      .select('*')
      .order('created_at', { ascending: true });

    if (ptData && ptData.length > 0) {
      setPts(ptData.map(row => ({
        id: row.id,
        nama: row.nama,
        kc: row.kc,
        sektor: row.sektor,
        kickoff: row.kickoff,
        relasi: row.relasi || [],
        covenant: row.covenant || [],
      })));
    } else {
      // Kalau database kosong, isi dengan data dummy awal
      await initSeedData();
    }

    // Load master referensi
    const { data: refData } = await supabase
      .from('master_referensi')
      .select('*')
      .eq('id', 'singleton')
      .single();

    if (refData) {
      setDivisiList(refData.divisi_list || INIT_DIVISI);
      setProdukMap(refData.produk_map || INIT_PRODUK);
      setCovenantTypes(refData.covenant_types || INIT_COVENANT_TYPES);
    }

    // Load RM
    const { data: rmData } = await supabase
      .from('rm_data')
      .select('*')
      .eq('id', 'singleton')
      .single();

    if (rmData) {
      setRmAll(rmData.rm_all || INIT_RM);
    }

    setOnline(true);
  } catch (err) {
    console.error('Gagal load data:', err);
    setOnline(false);
    // Fallback ke data dummy jika offline
    setPts(INIT_PT);
  } finally {
    setLoading(false);
  }
};

// Seed data dummy ke database jika masih kosong
const initSeedData = async () => {
  // Insert semua PT dummy
  for (const pt of INIT_PT) {
    await supabase.from('pt_nasabah').upsert({
      id: pt.id,
      nama: pt.nama,
      kc: pt.kc,
      sektor: pt.sektor,
      kickoff: pt.kickoff,
      relasi: pt.relasi,
      covenant: pt.covenant,
    });
  }
  setPts(INIT_PT);

  // Insert master referensi
  await supabase.from('master_referensi').upsert({
    id: 'singleton',
    divisi_list: INIT_DIVISI,
    produk_map: INIT_PRODUK,
    covenant_types: INIT_COVENANT_TYPES,
  });

  // Insert RM
  await supabase.from('rm_data').upsert({
    id: 'singleton',
    rm_all: INIT_RM,
  });
};

const savePTtoDB = async (pt) => {
  setSyncing(true);
  try {
    await supabase.from('pt_nasabah').upsert({
      id: pt.id,
      nama: pt.nama,
      kc: pt.kc,
      sektor: pt.sektor,
      kickoff: pt.kickoff,
      relasi: pt.relasi,
      covenant: pt.covenant,
    });
    setOnline(true);
  } catch (err) {
    console.error('Gagal simpan PT:', err);
    setOnline(false);
  } finally {
    setSyncing(false);
  }
};

const deletePTfromDB = async (ptId) => {
  setSyncing(true);
  try {
    await supabase.from('pt_nasabah').delete().eq('id', ptId);
    setOnline(true);
  } catch (err) {
    console.error('Gagal hapus PT:', err);
    setOnline(false);
  } finally {
    setSyncing(false);
  }
};

const saveMasterRef = async (divisi, produk, covenant) => {
  setSyncing(true);
  try {
    await supabase.from('master_referensi').upsert({
      id: 'singleton',
      divisi_list: divisi,
      produk_map: produk,
      covenant_types: covenant,
    });
    setOnline(true);
  } catch (err) {
    console.error('Gagal simpan master referensi:', err);
    setOnline(false);
  } finally {
    setSyncing(false);
  }
};

const saveRMtoDB = async (rmData) => {
  setSyncing(true);
  try {
    await supabase.from('rm_data').upsert({
      id: 'singleton',
      rm_all: rmData,
    });
    setOnline(true);
  } catch (err) {
    console.error('Gagal simpan RM:', err);
    setOnline(false);
  } finally {
    setSyncing(false);
  }
};

  // Alert badge count
  const alertCount = useMemo(() => {
    let count = 0;
    pts.forEach(pt => {
      pt.relasi.forEach(rel => rel.produk.forEach(p => {
        const st = calcStatus(p.mulai, p.deadline, p.grace, p.realisasi, p.target);
        if (st === "Overdue" || st === "Grace Period") count++;
      }));
      pt.covenant.forEach(cv => {
        if (calcCovenantStatus(cv.realisasi, cv.target) !== "Terpenuhi") count++;
      });
    });
    return count;
  }, [pts]);

  const menus = [
    { id: "overview", label: "Overview Regional", icon: <Home size={18} /> },
    { id: "ekosistem", label: "Manajemen Ekosistem", icon: <Building2 size={18} /> },
    { id: "rm", label: "Performa RM", icon: <Users size={18} /> },
    { id: "nasabah", label: "Performa Nasabah", icon: <BarChart2 size={18} /> },
    { id: "alert", label: "Alert & Covenant", icon: <Bell size={18} />, badge: alertCount },
    { id: "settings", label: "Pengaturan Referensi", icon: <Settings size={18} /> },
  ];

  const renderPage = () => {
    const rmList = rmAll[selectedKC === "Semua KC" ? "KC Samarinda Gajah Mada" : selectedKC] || [];
    switch (activeMenu) {
      case "overview": return <Overview pts={pts} selectedKC={selectedKC} />;
      case "ekosistem": return <Ekosistem pts={pts} selectedKC={selectedKC} divisiList={divisiList}
        produkMap={produkMap} rmAll={rmAll}
        onPTsChange={async (newPts, changedPT, isDelete) => {
          setPts(newPts);
          if (isDelete && changedPT) await deletePTfromDB(changedPT.id);
          else if (changedPT) await savePTtoDB(changedPT);
        }}
        covenantTypes={covenantTypes}
        onAddCovenantType={async (t) => {
          const updated = covenantTypes.includes(t) ? covenantTypes : [...covenantTypes, t];
          setCovenantTypes(updated);
          await saveMasterRef(divisiList, produkMap, updated);
        }} />;
      case "rm": return <PerformaRM pts={pts} rmAll={rmAll} divisiList={divisiList} selectedKC={selectedKC}
        onRMChange={async (newRM) => {
          setRmAll(newRM);
          await saveRMtoDB(newRM);
        }} />;
      case "nasabah": return <PerfomaNasabah pts={pts} selectedKC={selectedKC} />;
      case "alert": return <AlertCovenant pts={pts} selectedKC={selectedKC} />;
      case "settings": return <Pengaturan
        divisiList={divisiList}
        setDivisiList={async (v) => { setDivisiList(v); await saveMasterRef(v, produkMap, covenantTypes); }}
        produkMap={produkMap}
        setProdukMap={async (v) => { setProdukMap(v); await saveMasterRef(divisiList, v, covenantTypes); }}
        covenantTypes={covenantTypes}
        setCovenantTypes={async (v) => { setCovenantTypes(v); await saveMasterRef(divisiList, produkMap, v); }} />;
      default: return null;
    }
  };
if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#003f88" }}>
          <Activity size={24} className="text-white animate-pulse" />
        </div>
        <div className="text-gray-600 font-medium">Memuat data dari server...</div>
        <div className="text-gray-400 text-sm mt-1">BRI Ecosystem Monitor</div>
      </div>
    </div>
  );
  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden" style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Sidebar */}
      <div className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-sm">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#003f88" }}>
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: "#003f88" }}>BRI Ecosystem</div>
              <div className="text-xs text-gray-500">Monitor · Kanwil Balikpapan</div>
            </div>
          </div>
          <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-gray-50"
            value={selectedKC} onChange={e => setSelectedKC(e.target.value)}>
            <option>Semua KC</option>
            {KC_LIST.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {menus.map(m => (
            <button key={m.id} onClick={() => setActiveMenu(m.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                activeMenu === m.id
                  ? "text-white font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`}
              style={activeMenu === m.id ? { backgroundColor: "#003f88" } : {}}>
              {m.icon}
              <span className="flex-1 text-left">{m.label}</span>
              {m.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">KC Aktif:</div>
          <div className="text-xs font-semibold text-gray-700 truncate">{selectedKC}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="font-bold text-gray-800">{menus.find(m => m.id === activeMenu)?.label}</h1>
          <div className="flex items-center gap-3">
            {syncing && (
              <div className="flex items-center gap-1 text-xs text-blue-500">
                <RefreshCw size={12} className="animate-spin" /> Menyimpan...
              </div>
            )}
            {online ? (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Wifi size={12} /> Online
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <WifiOff size={12} /> Offline
              </div>
            )}
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Page */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
