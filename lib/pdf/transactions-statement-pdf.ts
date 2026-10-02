import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface TransactionPdfRecord {
  _id: string;
  date: string | Date;
  createdAt?: string | Date;
  shop?: {
    name?: string;
    code?: string;
    shopType?: string;
  };
  billNumber?: string;
  category?: {
    name?: string;
  };
  type: "INCOME" | "EXPENSE";
  paymentMethod: string;
  bankAccount?: {
    bankName?: string;
    accountNumber?: string;
  };
  reason?: string;
  itemCode?: string;
  itemName?: string;
  quantity?: number;
  amount: number;
  approvedAmount?: number | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentBalance?: number;
  createdBy?: {
    name?: string;
    email?: string;
  };
}

export interface TransactionPdfSummary {
  totalIncome: number;
  totalExpense: number;
  approvedIncome: number;
  approvedExpense: number;
  netBalance: number;
}

export interface TransactionPdfFilters {
  shopName: string;
  typeLabel: string;
  paymentMethodLabel: string;
  bankAccountLabel: string;
  categoryLabel: string;
  statusLabel: string;
  dateRangeLabel: string;
  searchQuery: string;
}

export interface GenerateTransactionPdfParams {
  records: TransactionPdfRecord[];
  summary: TransactionPdfSummary;
  filters: TransactionPdfFilters;
  generatedBy?: string;
}

export function exportTransactionsStatementPDF({
  records,
  summary,
  filters,
  generatedBy = "Administrator",
}: GenerateTransactionPdfParams) {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let currentY = 14;

  // 1. Top Decorative Brand Accent Line
  doc.setFillColor(37, 99, 235); // Royal Blue accent
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 2.5, "F");
  currentY += 8;

  // 2. Company Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text("NEXTGEN ONLINE SCHOOL (PVT) LTD", marginX, currentY);

  // Statement Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text("TRANSACTIONS STATEMENT", pageWidth - marginX, currentY, { align: "right" });
  currentY += 5.5;

  // Subtitle / Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("Enterprise Financial Management & Comprehensive Audit Ledger", marginX, currentY);

  const formattedDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Generated on: ${formattedDate} | Issuer: ${generatedBy}`, pageWidth - marginX, currentY, {
    align: "right",
  });
  currentY += 6;

  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.4);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 4.5;

  // 3. Applied Filters Card (Light Theme)
  const filterBoxY = currentY;
  const filterBoxHeight = 16;
  const filterBoxWidth = pageWidth - marginX * 2;

  // Card Background
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, filterBoxY, filterBoxWidth, filterBoxHeight, 1.5, 1.5, "FD");

  // Filters Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text("APPLIED STATEMENT FILTERS:", marginX + 3.5, filterBoxY + 4.5);

  // Filter Items in a clean 4-column layout
  doc.setFontSize(7.5);
  const colWidth = (filterBoxWidth - 8) / 4;
  const row1Y = filterBoxY + 9;
  const row2Y = filterBoxY + 13.5;

  // Col 1: Shop & Period
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Branch: ", marginX + 4, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.shopName.length > 22 ? filters.shopName.substring(0, 20) + "..." : filters.shopName, marginX + 16, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Period: ", marginX + 4, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.dateRangeLabel, marginX + 16, row2Y);

  // Col 2: Type & Payment Method
  const col2X = marginX + 4 + colWidth;
  doc.setFont("helvetica", "bold");
  doc.text("Type: ", col2X, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.typeLabel, col2X + 12, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Method: ", col2X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.paymentMethodLabel, col2X + 14, row2Y);

  // Col 3: Category & Bank
  const col3X = marginX + 4 + colWidth * 2;
  doc.setFont("helvetica", "bold");
  doc.text("Category: ", col3X, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.categoryLabel.length > 20 ? filters.categoryLabel.substring(0, 18) + "..." : filters.categoryLabel, col3X + 16, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Bank: ", col3X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.bankAccountLabel.length > 20 ? filters.bankAccountLabel.substring(0, 18) + "..." : filters.bankAccountLabel, col3X + 12, row2Y);

  // Col 4: Status & Search
  const col4X = marginX + 4 + colWidth * 3;
  doc.setFont("helvetica", "bold");
  doc.text("Status: ", col4X, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.statusLabel, col4X + 13, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("Search: ", col4X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(filters.searchQuery.length > 18 ? filters.searchQuery.substring(0, 16) + "..." : filters.searchQuery, col4X + 13, row2Y);

  currentY += filterBoxHeight + 4;

  // 4. Executive KPI Summary Cards
  const kpiCardWidth = (filterBoxWidth - 9) / 4;
  const kpiHeight = 13.5;

  const kpis = [
    {
      label: "TOTAL TRANSACTIONS",
      value: records.length.toLocaleString(),
      textColor: [15, 23, 42], // Slate 900
      bg: [255, 255, 255],
      border: [203, 213, 225],
    },
    {
      label: "TOTAL INFLOW (INCOME)",
      value: `LKR ${summary.approvedIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: [5, 150, 105], // Emerald 600
      bg: [240, 253, 244], // Emerald 50
      border: [167, 243, 208],
    },
    {
      label: "TOTAL OUTFLOW (EXPENSE)",
      value: `LKR ${summary.approvedExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: [225, 29, 72], // Rose 600
      bg: [255, 241, 242], // Rose 50
      border: [254, 205, 211],
    },
    {
      label: "NET BALANCE POSITION",
      value: `LKR ${summary.netBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      textColor: summary.netBalance >= 0 ? [37, 99, 235] : [225, 29, 72],
      bg: [238, 242, 255], // Indigo 50
      border: [199, 210, 254],
    },
  ];

  kpis.forEach((kpi, index) => {
    const kpiX = marginX + index * (kpiCardWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(kpiX, currentY, kpiCardWidth, kpiHeight, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kpiX + 3, currentY + 4.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(kpi.textColor[0], kpi.textColor[1], kpi.textColor[2]);
    doc.text(kpi.value, kpiX + 3, currentY + 9.8);
  });

  currentY += kpiHeight + 5;

  // 5. Table of Transactions with Chronological Running Balance
  let cumulativeBalance = 0;
  const tableData = records.map((record, index) => {
    const rawDate = record.createdAt || record.date;
    const d = new Date(rawDate);
    const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const branchName = record.shop?.name || "-";
    const billNo = record.billNumber || "-";
    const category = record.category?.name || "General";
    const method = (record.paymentMethod || "").replace(/_/g, " ");

    let desc = record.reason || "";
    if (record.itemName) {
      desc = `[${record.itemCode || "ITEM"}] ${record.itemName} (Qty: ${record.quantity || 1}) ${desc ? `| ${desc}` : ""}`;
    }
    if (record.bankAccount?.bankName) {
      desc += ` [${record.bankAccount.bankName}]`;
    }

    const effectiveAmount =
      record.status === "APPROVED" && typeof record.approvedAmount === "number"
        ? record.approvedAmount
        : record.amount;

    // Running Balance: increases on income, decreases on expense
    if (record.status !== "REJECTED") {
      if (record.type === "INCOME") {
        cumulativeBalance += effectiveAmount;
      } else {
        cumulativeBalance -= effectiveAmount;
      }
    }

    const currentBal = typeof record.currentBalance === "number" ? record.currentBalance : cumulativeBalance;

    const formattedAmount = `${record.type === "INCOME" ? "+" : "-"} ${effectiveAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    const formattedBalance = `LKR ${currentBal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return [
      (index + 1).toString(),
      `${dateStr}\n${timeStr}`,
      branchName,
      billNo,
      category,
      method,
      desc.length > 50 ? desc.substring(0, 48) + "..." : desc,
      record.type,
      formattedAmount,
      formattedBalance,
      record.status,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX, bottom: 16 },
    head: [
      [
        "#",
        "DATE & TIME",
        "BRANCH",
        "BILL #",
        "CATEGORY",
        "METHOD",
        "DESCRIPTION / NOTE",
        "TYPE",
        "AMOUNT (LKR)",
        "CURRENT BALANCE",
        "STATUS",
      ],
    ],
    body: tableData,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7,
      textColor: [51, 65, 85], // Slate 700
      cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: 2.8, bottom: 2.8, left: 2, right: 2 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 22 },
      3: { cellWidth: 22, fontStyle: "bold" },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: "auto" }, // Expands with note
      7: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      8: { cellWidth: 25, halign: "right", fontStyle: "bold" },
      9: { cellWidth: 27, halign: "right", fontStyle: "bold" },
      10: { cellWidth: 16, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Color-code Type column
      if (data.section === "body" && data.column.index === 7) {
        if (data.cell.raw === "INCOME") {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
        } else {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        }
      }

      // Color-code Amount column
      if (data.section === "body" && data.column.index === 8) {
        const text = String(data.cell.raw || "");
        if (text.startsWith("+")) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald
        } else if (text.startsWith("-")) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose
        }
      }

      // Color-code Current Balance column
      if (data.section === "body" && data.column.index === 9) {
        const text = String(data.cell.raw || "");
        if (text.includes("-")) {
          data.cell.styles.textColor = [225, 29, 72]; // Rose if negative
        } else {
          data.cell.styles.textColor = [30, 41, 59]; // Slate 800
        }
      }

      // Color-code Status column
      if (data.section === "body" && data.column.index === 10) {
        if (data.cell.raw === "APPROVED") {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (data.cell.raw === "PENDING") {
          data.cell.styles.textColor = [217, 119, 6];
        } else if (data.cell.raw === "REJECTED") {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  // 6. Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Left Footer Notice
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      "CONFIDENTIAL & PROPRIETARY | Nextgen Online School (Pvt) Ltd - Generated via Newgen ERP System",
      marginX,
      pageHeight - 6.5
    );

    // Right Page Number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, {
      align: "right",
    });
  }

  // Save the PDF
  const sanitizedDate = new Date().toISOString().split("T")[0];
  const filename = `Nextgen_Transactions_Statement_${sanitizedDate}.pdf`;
  doc.save(filename);
}
