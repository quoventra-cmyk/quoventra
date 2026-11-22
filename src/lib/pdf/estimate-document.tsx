import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { DocumentTemplateStyle } from "@/components/ui/document-color-picker";
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
  template_style?: DocumentTemplateStyle | null;
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
    props.business.brand_color &&
    /^#[0-9a-fA-F]{6}$/.test(props.business.brand_color)
      ? props.business.brand_color
      : "#2563eb";
  const templateStyle = props.business.template_style ?? "executive_sidebar";
  const docLabel = props.documentLabel ?? "Estimate";

  const addressParts = [
    props.business.address,
    props.business.city,
    props.business.region,
    props.business.postal_code,
    props.business.country,
  ].filter(Boolean);

  if (
    templateStyle === "executive_sidebar" ||
    templateStyle === "bold_split_header" ||
    templateStyle === "sleek_agency"
  ) {
    const headerBg = templateStyle === "sleek_agency" ? "#0f172a" : accent;
    const s = StyleSheet.create({
      page: {
        paddingTop: 0,
        paddingBottom: 42,
        paddingHorizontal: 0,
        fontSize: 9.5,
        fontFamily: "Helvetica",
        color: "#0f172a",
        backgroundColor: "#ffffff",
      },
      headerBand: {
        backgroundColor: headerBg,
        color: "#ffffff",
        paddingHorizontal: 36,
        paddingVertical: 26,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: templateStyle === "sleek_agency" ? 4 : 0,
        borderBottomColor: accent,
      },
      brandBox: {
        maxWidth: "58%",
      },
      logoBox: {
        backgroundColor: "#ffffff",
        padding: 6,
        borderRadius: 4,
        width: 56,
        height: 44,
        marginBottom: 8,
        justifyContent: "center",
        alignItems: "center",
      },
      logo: {
        width: 44,
        height: 32,
        objectFit: "contain",
      },
      companyTitle: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#ffffff",
      },
      companySub: {
        fontSize: 8.5,
        color: "#e2e8f0",
        marginTop: 2,
      },
      docBigTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#ffffff",
      },
      mainSplit: {
        flexDirection: "row",
        paddingHorizontal: 28,
        paddingTop: 20,
        gap: 18,
      },
      sidebar: {
        width: "30%",
        backgroundColor: "#eef2f9",
        borderRadius: 10,
        padding: 14,
        gap: 14,
      },
      sideLabel: {
        fontSize: 8,
        fontWeight: "bold",
        color: accent,
        textTransform: "uppercase",
        marginBottom: 3,
      },
      sideBold: {
        fontSize: 10.5,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 2,
      },
      sideText: {
        fontSize: 8.5,
        color: "#475569",
        lineHeight: 1.4,
      },
      contentCol: {
        width: "67%",
      },
      projectBanner: {
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
      },
      projectTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#0f172a",
      },
      tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1.5,
        borderBottomColor: accent,
        paddingVertical: 7,
        fontSize: 8,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
      },
      tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#cbd5e1",
        paddingVertical: 8,
      },
      colDesc: { width: "48%", paddingRight: 6 },
      colQty: { width: "16%", textAlign: "center" },
      colRate: { width: "18%", textAlign: "right" },
      colAmt: { width: "18%", textAlign: "right", fontWeight: "bold" },
      bottomSplit: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
        gap: 14,
      },
      termsCol: {
        width: "48%",
        gap: 8,
      },
      totalsCol: {
        width: "48%",
        gap: 4,
      },
      totRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 2,
      },
      totPill: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: accent,
        color: "#ffffff",
        borderRadius: 4,
        paddingVertical: 7,
        paddingHorizontal: 10,
        marginTop: 6,
        fontWeight: "bold",
        fontSize: 11,
      },
      footerBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        backgroundColor: accent,
        color: "#ffffff",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 36,
        fontSize: 8,
      },
    });

    return (
      <Document title={`${props.documentNumber} - ${props.title}`}>
        <Page size="A4" style={s.page}>
          <View style={s.headerBand}>
            <View style={s.brandBox}>
              {props.business.logo_url ? (
                <View style={s.logoBox}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={props.business.logo_url} style={s.logo} />
                </View>
              ) : null}
              <Text style={s.companyTitle}>{props.business.name}</Text>
              {addressParts.length > 0 ? (
                <Text style={s.companySub}>{addressParts.join(", ")}</Text>
              ) : null}
            </View>
            <Text style={s.docBigTitle}>{docLabel}</Text>
          </View>

          <View style={s.mainSplit}>
            <View style={s.sidebar}>
              <View>
                <Text style={s.sideLabel}>Bill To</Text>
                <Text style={s.sideBold}>
                  {props.customerName || "Valued Customer"}
                </Text>
                {props.customerAddress ? (
                  <Text style={s.sideText}>{props.customerAddress}</Text>
                ) : null}
                {props.customerPhone ? (
                  <Text style={s.sideText}>{props.customerPhone}</Text>
                ) : null}
                {props.customerEmail ? (
                  <Text style={s.sideText}>{props.customerEmail}</Text>
                ) : null}
              </View>

              <View>
                <Text style={s.sideLabel}>{docLabel} #</Text>
                <Text style={s.sideBold}>{props.documentNumber}</Text>
              </View>

              <View>
                <Text style={s.sideLabel}>Date of Issue</Text>
                <Text style={s.sideText}>{props.issueDate}</Text>
              </View>

              {props.expiryDate ? (
                <View>
                  <Text style={s.sideLabel}>Due / Valid Date</Text>
                  <Text style={s.sideText}>{props.expiryDate}</Text>
                </View>
              ) : null}

              <View>
                <Text style={s.sideLabel}>Status</Text>
                <Text style={s.sideBold}>{props.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={s.contentCol}>
              <View style={s.projectBanner}>
                <Text style={s.projectTitle}>{props.title}</Text>
                {props.description ? (
                  <Text style={[s.sideText, { marginTop: 2 }]}>
                    {props.description}
                  </Text>
                ) : null}
              </View>

              <View style={s.tableHeader}>
                <Text style={s.colDesc}>Item / Description</Text>
                <Text style={s.colQty}>Qty</Text>
                <Text style={s.colRate}>Rate</Text>
                <Text style={s.colAmt}>Amount</Text>
              </View>

              {props.items.map((item, idx) => (
                <View key={idx} style={s.tableRow}>
                  <View style={s.colDesc}>
                    <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                    {item.description ? (
                      <Text style={s.sideText}>{item.description}</Text>
                    ) : null}
                  </View>
                  <Text style={s.colQty}>
                    {Number(item.quantity)} {item.unit}
                  </Text>
                  <Text style={s.colRate}>
                    {formatCurrency(Number(item.unit_price), props.currency)}
                  </Text>
                  <Text style={s.colAmt}>
                    {formatCurrency(Number(item.line_total), props.currency)}
                  </Text>
                </View>
              ))}

              <View style={s.bottomSplit}>
                <View style={s.termsCol}>
                  {props.terms ? (
                    <View>
                      <Text style={s.sideLabel}>Terms</Text>
                      <Text style={s.sideText}>{props.terms}</Text>
                    </View>
                  ) : null}
                  {props.paymentInstructions ? (
                    <View>
                      <Text style={s.sideLabel}>Conditions / Instructions</Text>
                      <Text style={s.sideText}>
                        {props.paymentInstructions}
                      </Text>
                    </View>
                  ) : null}
                  {props.notes ? (
                    <View>
                      <Text style={s.sideLabel}>Notes</Text>
                      <Text style={s.sideText}>{props.notes}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.totalsCol}>
                  <View style={s.totRow}>
                    <Text style={{ fontWeight: "bold" }}>Subtotal</Text>
                    <Text>{formatCurrency(props.subtotal, props.currency)}</Text>
                  </View>
                  {props.discountAmount > 0 ? (
                    <View style={s.totRow}>
                      <Text style={{ fontWeight: "bold" }}>Discount</Text>
                      <Text>
                        -{formatCurrency(props.discountAmount, props.currency)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={s.totRow}>
                    <Text style={{ fontWeight: "bold" }}>
                      Tax ({(props.taxRate * 100).toFixed(2)}%)
                    </Text>
                    <Text>
                      {formatCurrency(props.taxAmount, props.currency)}
                    </Text>
                  </View>

                  <View style={s.totPill}>
                    <Text>TOTAL</Text>
                    <Text>{formatCurrency(props.total, props.currency)}</Text>
                  </View>

                  {props.amountPaid != null ? (
                    <View style={[s.totRow, { marginTop: 4 }]}>
                      <Text style={s.sideText}>Amount Paid</Text>
                      <Text>
                        {formatCurrency(props.amountPaid, props.currency)}
                      </Text>
                    </View>
                  ) : null}
                  {props.balanceDue != null ? (
                    <View style={s.totRow}>
                      <Text style={{ fontWeight: "bold", color: accent }}>
                        Balance Due
                      </Text>
                      <Text style={{ fontWeight: "bold", color: accent }}>
                        {formatCurrency(props.balanceDue, props.currency)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <View style={s.footerBar}>
            <Text>{props.business.email || props.business.name}</Text>
            <Text>{props.business.phone || "Generated with Quoventra"}</Text>
            <Text>{props.business.website || "quoventraa.com"}</Text>
          </View>
        </Page>
      </Document>
    );
  }

  if (
    templateStyle === "classic_banner" ||
    templateStyle === "centered_prestige" ||
    templateStyle === "minimal_swiss"
  ) {
    const s = StyleSheet.create({
      page: {
        paddingTop: 0,
        paddingBottom: 36,
        paddingHorizontal: 0,
        fontSize: 9.5,
        fontFamily: "Helvetica",
        color: "#1e293b",
        backgroundColor: "#ffffff",
      },
      topBar: {
        height: 18,
        backgroundColor: accent,
        borderBottomWidth: 1,
        borderBottomColor: "#0f172a",
      },
      bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 18,
        backgroundColor: accent,
        borderTopWidth: 1,
        borderTopColor: "#0f172a",
      },
      body: {
        paddingHorizontal: 40,
        paddingTop: 26,
      },
      topHeader: {
        flexDirection:
          templateStyle === "centered_prestige" ? "column" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
      },
      bigTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#0f172a",
        textTransform: "uppercase",
        letterSpacing: 1,
      },
      logo: {
        width: 54,
        height: 54,
        objectFit: "contain",
      },
      threeCol: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 22,
      },
      col3: {
        width: "31%",
      },
      col3Right: {
        width: "31%",
        alignItems: "flex-end",
        textAlign: "right",
      },
      accentLabel: {
        fontSize: 9.5,
        fontWeight: "bold",
        color: accent,
        marginBottom: 2,
      },
      textLine: {
        fontSize: 9,
        color: "#334155",
        lineHeight: 1.4,
      },
      tableHeader: {
        flexDirection: "row",
        backgroundColor: accent,
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 8.5,
        textTransform: "uppercase",
        paddingVertical: 8,
        paddingHorizontal: 10,
      },
      tableRow: {
        flexDirection: "row",
        backgroundColor: "#e5e7eb",
        borderBottomWidth: 1,
        borderBottomColor: "#ffffff",
        paddingVertical: 8,
        paddingHorizontal: 10,
      },
      tableRowAlt: {
        backgroundColor: "#f3f4f6",
      },
      colDesc: { width: "50%" },
      colQty: { width: "14%", textAlign: "center" },
      colRate: { width: "18%", textAlign: "right" },
      colAmt: { width: "18%", textAlign: "right", fontWeight: "bold" },
      totalsWrap: {
        alignItems: "flex-end",
        marginTop: 16,
        marginBottom: 18,
      },
      totalsBox: {
        width: 220,
        gap: 5,
      },
      totRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        fontSize: 9,
      },
      notesWrap: {
        gap: 10,
        marginTop: 8,
      },
    });

    return (
      <Document title={`${props.documentNumber} - ${props.title}`}>
        <Page size="A4" style={s.page}>
          <View style={s.topBar} />

          <View style={s.body}>
            <View style={s.topHeader}>
              <View>
                <Text style={s.bigTitle}>{docLabel}</Text>
                <Text style={[s.textLine, { marginTop: 3 }]}>
                  {props.title}
                </Text>
              </View>
              {props.business.logo_url ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={props.business.logo_url} style={s.logo} />
              ) : null}
            </View>

            <View style={s.threeCol}>
              <View style={s.col3}>
                <Text style={s.accentLabel}>{props.business.name}</Text>
                {addressParts.length > 0 ? (
                  <Text style={s.textLine}>{addressParts.join(", ")}</Text>
                ) : null}
                {props.business.email ? (
                  <Text style={s.textLine}>{props.business.email}</Text>
                ) : null}
                {props.business.phone ? (
                  <Text style={s.textLine}>{props.business.phone}</Text>
                ) : null}
              </View>

              <View style={s.col3}>
                <Text style={s.accentLabel}>{docLabel.toUpperCase()} TO:</Text>
                <Text style={[s.textLine, { fontWeight: "bold" }]}>
                  {props.customerName || "Valued Customer"}
                </Text>
                {props.customerAddress ? (
                  <Text style={s.textLine}>{props.customerAddress}</Text>
                ) : null}
                {props.customerEmail ? (
                  <Text style={s.textLine}>{props.customerEmail}</Text>
                ) : null}
                {props.customerPhone ? (
                  <Text style={s.textLine}>{props.customerPhone}</Text>
                ) : null}
              </View>

              <View style={s.col3Right}>
                <Text style={s.accentLabel}>{docLabel} Number</Text>
                <Text style={[s.textLine, { marginBottom: 6 }]}>
                  {props.documentNumber}
                </Text>
                <Text style={s.accentLabel}>Date of Issue</Text>
                <Text style={[s.textLine, { marginBottom: 6 }]}>
                  {props.issueDate}
                </Text>
                {props.expiryDate ? (
                  <>
                    <Text style={s.accentLabel}>Due / Valid Date</Text>
                    <Text style={s.textLine}>{props.expiryDate}</Text>
                  </>
                ) : null}
              </View>
            </View>

            <View>
              <View style={s.tableHeader}>
                <Text style={s.colDesc}>Description</Text>
                <Text style={s.colQty}>Qty</Text>
                <Text style={s.colRate}>Unit Price</Text>
                <Text style={s.colAmt}>Total</Text>
              </View>
              {props.items.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    s.tableRow,
                    idx % 2 === 1 ? s.tableRowAlt : {},
                  ]}
                >
                  <View style={s.colDesc}>
                    <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                    {item.description ? (
                      <Text style={s.textLine}>{item.description}</Text>
                    ) : null}
                  </View>
                  <Text style={s.colQty}>
                    {Number(item.quantity)} {item.unit}
                  </Text>
                  <Text style={s.colRate}>
                    {formatCurrency(Number(item.unit_price), props.currency)}
                  </Text>
                  <Text style={s.colAmt}>
                    {formatCurrency(Number(item.line_total), props.currency)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={s.totalsWrap}>
              <View style={s.totalsBox}>
                <View style={s.totRow}>
                  <Text>SUBTOTAL</Text>
                  <Text>{formatCurrency(props.subtotal, props.currency)}</Text>
                </View>
                {props.discountAmount > 0 ? (
                  <View style={s.totRow}>
                    <Text>DISCOUNT</Text>
                    <Text>
                      -{formatCurrency(props.discountAmount, props.currency)}
                    </Text>
                  </View>
                ) : null}
                <View style={s.totRow}>
                  <Text>TAX ({(props.taxRate * 100).toFixed(2)}%)</Text>
                  <Text>{formatCurrency(props.taxAmount, props.currency)}</Text>
                </View>
                <View
                  style={[
                    s.totRow,
                    {
                      fontWeight: "bold",
                      fontSize: 10.5,
                      borderTopWidth: 1,
                      borderTopColor: accent,
                      paddingTop: 5,
                      marginTop: 3,
                    },
                  ]}
                >
                  <Text>
                    {props.balanceDue != null ? "BALANCE DUE" : "TOTAL"}
                  </Text>
                  <Text style={{ color: accent }}>
                    {formatCurrency(
                      props.balanceDue != null ? props.balanceDue : props.total,
                      props.currency
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.notesWrap}>
              {props.notes ? (
                <View>
                  <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
                    NOTES:
                  </Text>
                  <Text style={s.textLine}>{props.notes}</Text>
                </View>
              ) : null}
              {props.terms ? (
                <View>
                  <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
                    TERMS AND CONDITIONS:
                  </Text>
                  <Text style={s.textLine}>{props.terms}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={s.bottomBar} />
        </Page>
      </Document>
    );
  }

  // Default / "modern_corporate" | "compact_contractor" | "royal_bordered"
  const isRoyal = templateStyle === "royal_bordered";
  const styles = StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingBottom: 38,
      paddingHorizontal: 0,
      fontSize: 9.5,
      fontFamily: "Helvetica",
      color: "#0f172a",
      backgroundColor: "#ffffff",
      borderWidth: isRoyal ? 6 : 0,
      borderColor: isRoyal ? accent : "#ffffff",
    },
    topBanner: {
      height: 10,
      backgroundColor: accent,
    },
    bottomBanner: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 10,
      backgroundColor: accent,
    },
    grayHeaderBand: {
      backgroundColor: "#f3f4f6",
      paddingHorizontal: 40,
      paddingVertical: 18,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    brandBlock: {
      maxWidth: "56%",
    },
    logo: {
      width: 44,
      height: 44,
      objectFit: "contain",
      marginBottom: 6,
    },
    businessName: {
      fontSize: 15,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 3,
    },
    muted: {
      color: "#475569",
      fontSize: 8.5,
      lineHeight: 1.4,
    },
    docMeta: {
      alignItems: "flex-end",
      textAlign: "right",
      width: 170,
    },
    docTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
    },
    metaUnderlineBox: {
      width: "100%",
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingVertical: 3,
      marginBottom: 5,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 8.5,
    },
    body: {
      paddingHorizontal: 40,
    },
    twoCol: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 18,
      gap: 20,
    },
    infoCard: {
      width: "48%",
    },
    sectionLabel: {
      fontSize: 8.5,
      fontWeight: "bold",
      textTransform: "uppercase",
      color: "#1e293b",
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
      paddingBottom: 3,
      marginBottom: 6,
    },
    projectTitle: {
      fontSize: 11,
      fontWeight: "bold",
      color: "#0f172a",
      marginBottom: 3,
    },
    table: {
      borderWidth: 1,
      borderColor: "#cbd5e1",
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontWeight: "bold",
      fontSize: 8.5,
      color: "#ffffff",
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    tableRowAlt: {
      backgroundColor: "#f8fafc",
    },
    colDesc: { width: "48%" },
    colQty: { width: "16%", textAlign: "center" },
    colRate: { width: "18%", textAlign: "right" },
    colTotal: { width: "18%", textAlign: "right" },
    bottomSplit: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
    },
    remarksCol: {
      width: "48%",
      gap: 8,
    },
    totalsBox: {
      width: 220,
      gap: 4,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingVertical: 3,
      fontSize: 8.5,
    },
    grandTotalBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#f1f5f9",
      borderTopWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: accent,
      paddingVertical: 7,
      paddingHorizontal: 8,
      marginTop: 4,
      fontSize: 11,
      fontWeight: "bold",
    },
  });

  return (
    <Document title={`${props.documentNumber} - ${props.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBanner} />

        <View style={styles.grayHeaderBand}>
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
          </View>

          <View style={styles.docMeta}>
            <Text style={styles.docTitle}>{docLabel}</Text>
            <View style={styles.metaUnderlineBox}>
              <Text style={{ fontWeight: "bold" }}>DATE</Text>
              <Text>{props.issueDate}</Text>
            </View>
            <View style={styles.metaUnderlineBox}>
              <Text style={{ fontWeight: "bold" }}>{docLabel.toUpperCase()} NO.</Text>
              <Text>{props.documentNumber}</Text>
            </View>
            {props.expiryDate ? (
              <View style={styles.metaUnderlineBox}>
                <Text style={{ fontWeight: "bold" }}>DUE / VALID</Text>
                <Text>{props.expiryDate}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.twoCol}>
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Bill To</Text>
              <Text style={styles.projectTitle}>
                {props.customerName || "Valued Customer"}
              </Text>
              {props.customerAddress ? (
                <Text style={styles.muted}>{props.customerAddress}</Text>
              ) : null}
              {props.customerPhone ? (
                <Text style={styles.muted}>{props.customerPhone}</Text>
              ) : null}
              {props.customerEmail ? (
                <Text style={styles.muted}>{props.customerEmail}</Text>
              ) : null}
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.sectionLabel}>Project / Scope</Text>
              <Text style={styles.projectTitle}>{props.title}</Text>
              {props.description ? (
                <Text style={styles.muted}>{props.description}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colRate}>Unit Price</Text>
              <Text style={styles.colTotal}>Total</Text>
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
                <Text style={[styles.colTotal, { fontWeight: "bold" }]}>
                  {formatCurrency(Number(item.line_total), props.currency)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.bottomSplit}>
            <View style={styles.remarksCol}>
              {props.paymentInstructions || props.notes || props.terms ? (
                <View>
                  <Text style={{ fontWeight: "bold", fontSize: 8.5, marginBottom: 3 }}>
                    Remarks / Payment Instructions:
                  </Text>
                  {props.paymentInstructions ? (
                    <Text style={styles.muted}>{props.paymentInstructions}</Text>
                  ) : null}
                  {props.notes ? (
                    <Text style={styles.muted}>{props.notes}</Text>
                  ) : null}
                  {props.terms ? (
                    <Text style={styles.muted}>{props.terms}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={{ fontWeight: "bold" }}>SUBTOTAL</Text>
                <Text>{formatCurrency(props.subtotal, props.currency)}</Text>
              </View>
              {props.discountAmount > 0 ? (
                <View style={styles.totalRow}>
                  <Text style={{ fontWeight: "bold" }}>DISCOUNT</Text>
                  <Text>
                    -{formatCurrency(props.discountAmount, props.currency)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={{ fontWeight: "bold" }}>TAX RATE</Text>
                <Text>{(props.taxRate * 100).toFixed(2)}%</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ fontWeight: "bold" }}>TOTAL TAX</Text>
                <Text>{formatCurrency(props.taxAmount, props.currency)}</Text>
              </View>
              <View style={styles.grandTotalBox}>
                <Text>
                  {props.balanceDue != null ? "Balance Due" : "Total"}
                </Text>
                <Text style={{ color: accent }}>
                  {formatCurrency(
                    props.balanceDue != null ? props.balanceDue : props.total,
                    props.currency
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomBanner} />
      </Page>
    </Document>
  );
}
