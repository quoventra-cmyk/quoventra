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
  const accent =
    props.business.brand_color && /^#[0-9a-fA-F]{6}$/.test(props.business.brand_color)
      ? props.business.brand_color
      : "#2563eb";

  const styles = StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingBottom: 48,
      paddingHorizontal: 0,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    topBanner: {
      height: 8,
      backgroundColor: accent,
      marginBottom: 28,
    },
    body: {
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1.5,
      borderBottomColor: "#e2e8f0",
      paddingBottom: 18,
      marginBottom: 20,
    },
    brandBlock: {
      maxWidth: "56%",
    },
    logo: {
      width: 48,
      height: 48,
      objectFit: "contain",
      marginBottom: 8,
    },
    businessName: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 4,
    },
    muted: {
      color: "#475569",
      fontSize: 9,
      lineHeight: 1.45,
    },
    docMeta: {
      alignItems: "flex-end",
      textAlign: "right",
    },
    docTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: accent,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    docNumber: {
      fontSize: 11,
      fontWeight: "bold",
      color: "#0f172a",
      marginTop: 4,
    },
    statusBadge: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: "#f1f5f9",
      fontSize: 8,
      fontWeight: "bold",
      color: accent,
      textTransform: "uppercase",
    },
    twoCol: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      gap: 14,
    },
    infoCard: {
      width: "48%",
      backgroundColor: "#f8fafc",
      borderLeftWidth: 3,
      borderLeftColor: accent,
      borderRadius: 4,
      padding: 12,
    },
    sectionLabel: {
      fontSize: 8,
      fontWeight: "bold",
      textTransform: "uppercase",
      color: accent,
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    projectTitle: {
      fontSize: 11.5,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 4,
    },
    table: {
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 6,
      overflow: "hidden",
      marginBottom: 20,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      paddingVertical: 9,
      paddingHorizontal: 12,
      fontWeight: "bold",
      fontSize: 8.5,
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    tableRowAlt: {
      backgroundColor: "#f8fafc",
    },
    colDesc: { width: "48%" },
    colQty: { width: "16%", textAlign: "right" },
    colRate: { width: "18%", textAlign: "right" },
    colTotal: { width: "18%", textAlign: "right" },
    totalsContainer: {
      alignItems: "flex-end",
      marginBottom: 22,
    },
    totalsBox: {
      width: 240,
      backgroundColor: "#f8fafc",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 6,
      padding: 12,
      gap: 5,
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
      paddingTop: 8,
      marginTop: 4,
      fontSize: 12.5,
      fontWeight: "bold",
    },
    notesSection: {
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      paddingTop: 14,
      gap: 10,
    },
    footer: {
      position: "absolute",
      bottom: 22,
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
        <View style={styles.topBanner} />

        <View style={styles.body}>
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
              <Text style={styles.statusBadge}>
                {props.status.toUpperCase()}
              </Text>
              <Text style={[styles.muted, { marginTop: 8 }]}>
                Issue Date: {props.issueDate}
              </Text>
              {props.expiryDate ? (
                <Text style={styles.muted}>
                  Valid / Due: {props.expiryDate}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Customer & Project */}
          <View style={styles.twoCol}>
            <View style={styles.infoCard}>
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
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Project Details</Text>
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
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <View style={styles.colDesc}>
                  <Text style={{ fontWeight: "bold", color: "#0f172a" }}>
                    {item.name}
                  </Text>
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
                <Text style={[styles.colTotal, { fontWeight: "bold" }]}>
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
        </View>

        <Text style={styles.footer}>
          Generated with Quoventra • Estimate smarter. Grow faster.
        </Text>
      </Page>
    </Document>
  );
}
