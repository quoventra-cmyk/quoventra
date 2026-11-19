import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/pricing/engine";

export interface PdfBusinessInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
  tax_registration_number?: string | null;
  brand_color?: string | null;
}

export interface PdfLineItem {
  name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface EstimatePdfProps {
  documentLabel?: string;
  documentNumber: string;
  status: string;
  title: string;
  description?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  paymentInstructions?: string | null;
  amountPaid?: number;
  balanceDue?: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  business: PdfBusinessInfo;
  items: PdfLineItem[];
}

export function EstimatePdfDocument(props: EstimatePdfProps) {
  const accent = props.business.brand_color || "#2563eb";
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 2,
      borderBottomColor: accent,
      paddingBottom: 16,
      marginBottom: 20,
    },
    brandBlock: {
      maxWidth: "58%",
    },
    logo: {
      width: 48,
      height: 48,
      objectFit: "contain",
      marginBottom: 6,
    },
    businessName: {
      fontSize: 16,
      fontWeight: "bold",
      color: accent,
      marginBottom: 4,
    },
    muted: {
      color: "#475569",
      fontSize: 9,
      lineHeight: 1.4,
    },
    docMeta: {
      alignItems: "flex-end",
      textAlign: "right",
    },
    docTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#0f172a",
      textTransform: "uppercase",
    },
    docNumber: {
      fontSize: 11,
      fontWeight: "bold",
      color: accent,
      marginTop: 4,
    },
    twoCol: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      gap: 20,
    },
    col: {
      width: "48%",
    },
    sectionLabel: {
      fontSize: 8,
      fontWeight: "bold",
      textTransform: "uppercase",
      color: "#64748b",
      marginBottom: 4,
    },
    projectTitle: {
      fontSize: 12,
      fontWeight: "bold",
      marginBottom: 4,
    },
    table: {
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 4,
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#f8fafc",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontWeight: "bold",
      fontSize: 9,
      color: "#475569",
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    colDesc: { width: "48%" },
    colQty: { width: "16%", textAlign: "right" },
    colRate: { width: "18%", textAlign: "right" },
    colTotal: { width: "18%", textAlign: "right" },
    totalsContainer: {
      alignItems: "flex-end",
      marginBottom: 24,
    },
    totalsBox: {
      width: 220,
      gap: 4,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 2,
    },
    grandTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1.5,
      borderTopColor: accent,
      paddingTop: 6,
      marginTop: 4,
      fontSize: 12,
      fontWeight: "bold",
    },
    notesSection: {
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      paddingTop: 12,
      gap: 8,
    },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 8,
      color: "#94a3b8",
    },
  });

  const addressParts = [
    props.business.address,
    props.business.city,
    props.business.region,
    props.business.postal_code,
    props.business.country,
  ].filter(Boolean);

  return (
    <Document title={`${props.documentNumber} - ${props.title}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {props.business.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={props.business.logo_url} style={styles.logo} />
            ) : null}
            <Text style={styles.businessName}>{props.business.name}</Text>
            {addressParts.length > 0 ? (
              <Text style={styles.muted}>{addressParts.join(", ")}</Text>
            ) : null}
            {props.business.email ? (
              <Text style={styles.muted}>{props.business.email}</Text>
            ) : null}
            {props.business.phone ? (
              <Text style={styles.muted}>{props.business.phone}</Text>
            ) : null}
            {props.business.tax_registration_number ? (
              <Text style={styles.muted}>
                Tax ID: {props.business.tax_registration_number}
              </Text>
            ) : null}
          </View>

          <View style={styles.docMeta}>
            <Text style={styles.docTitle}>
              {props.documentLabel ?? "Estimate"}
            </Text>
            <Text style={styles.docNumber}>{props.documentNumber}</Text>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Status: {props.status.toUpperCase()}
            </Text>
            <Text style={styles.muted}>Issue Date: {props.issueDate}</Text>
            {props.expiryDate ? (
              <Text style={styles.muted}>Valid Until: {props.expiryDate}</Text>
            ) : null}
          </View>
        </View>

        {/* Customer & Project */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Prepared For</Text>
            <Text style={styles.projectTitle}>
              {props.customerName || "Valued Customer"}
            </Text>
            {props.customerEmail ? (
              <Text style={styles.muted}>{props.customerEmail}</Text>
            ) : null}
            {props.customerPhone ? (
              <Text style={styles.muted}>{props.customerPhone}</Text>
            ) : null}
            {props.customerAddress ? (
              <Text style={styles.muted}>{props.customerAddress}</Text>
            ) : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Project</Text>
            <Text style={styles.projectTitle}>{props.title}</Text>
            {props.description ? (
              <Text style={styles.muted}>{props.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {props.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.muted}>{item.description}</Text>
                ) : null}
              </View>
              <Text style={styles.colQty}>
                {Number(item.quantity)} {item.unit}
              </Text>
              <Text style={styles.colRate}>
                {formatCurrency(Number(item.unit_price), props.currency)}
              </Text>
              <Text style={styles.colTotal}>
                {formatCurrency(Number(item.line_total), props.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            {props.discountAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Discount</Text>
                <Text>
                  -{formatCurrency(props.discountAmount, props.currency)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text>{formatCurrency(props.subtotal, props.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.muted}>
                Tax ({(props.taxRate * 100).toFixed(2)}%)
              </Text>
              <Text>{formatCurrency(props.taxAmount, props.currency)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text>Total</Text>
              <Text style={{ color: accent }}>
                {formatCurrency(props.total, props.currency)}
              </Text>
            </View>
            {props.amountPaid != null ? (
              <View style={styles.totalRow}>
                <Text style={styles.muted}>Amount Paid</Text>
                <Text>
                  {formatCurrency(props.amountPaid, props.currency)}
                </Text>
              </View>
            ) : null}
            {props.balanceDue != null ? (
              <View style={[styles.totalRow, { fontWeight: "bold" }]}>
                <Text>Balance Due</Text>
                <Text style={{ color: accent }}>
                  {formatCurrency(props.balanceDue, props.currency)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Notes, Payment Instructions & Terms */}
        {props.notes || props.terms || props.paymentInstructions ? (
          <View style={styles.notesSection}>
            {props.paymentInstructions ? (
              <View>
                <Text style={styles.sectionLabel}>Payment Instructions</Text>
                <Text style={styles.muted}>{props.paymentInstructions}</Text>
              </View>
            ) : null}
            {props.notes ? (
              <View>
                <Text style={styles.sectionLabel}>Notes</Text>
                <Text style={styles.muted}>{props.notes}</Text>
              </View>
            ) : null}
            {props.terms ? (
              <View>
                <Text style={styles.sectionLabel}>Terms &amp; Conditions</Text>
                <Text style={styles.muted}>{props.terms}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generated with Quoventra • Estimate smarter. Grow faster.
        </Text>
      </Page>
    </Document>
  );
}

