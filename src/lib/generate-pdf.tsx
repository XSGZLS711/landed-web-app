import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Font } from '@react-pdf/renderer';
import type { ResumeData } from '@/types/resume';

const styles = StyleSheet.create({
  page: { paddingHorizontal: 45, paddingVertical: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#334155' },
  name: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 3 },
  contact: { fontSize: 9, color: '#64748b', marginBottom: 8 },
  sectionHeader: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#2563eb', letterSpacing: 1, marginTop: 12, marginBottom: 3 },
  hr: { borderBottomWidth: 0.5, borderBottomColor: '#cccccc', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 1 },
  jobTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  meta: { fontSize: 9.5, color: '#64748b' },
  body: { fontSize: 10, lineHeight: 1.5, color: '#334155', marginTop: 4 },
  bullet: { fontSize: 10, lineHeight: 1.4, color: '#334155', marginLeft: 10, marginBottom: 1 },
});

function Section({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.hr} />
    </View>
  );
}

function ResumePDF({ data }: { data: ResumeData }) {
  const contact = [data.email, data.phone, data.location].filter(Boolean).join(' · ');
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.name || 'Your Name'}</Text>
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}

        {data.summary ? (
          <View>
            <Section title="SUMMARY" />
            <Text style={styles.body}>{data.summary}</Text>
          </View>
        ) : null}

        {data.experience?.length ? (
          <View>
            <Section title="EXPERIENCE" />
            {data.experience.map((exp, i) => (
              <View key={i}>
                <View style={styles.row}>
                  <Text style={styles.jobTitle}>{exp.role}</Text>
                  <Text style={styles.meta}>{exp.dates}</Text>
                </View>
                <Text style={styles.meta}>{exp.company}</Text>
                {exp.bullets?.map((b, j) => (
                  <Text key={j} style={styles.bullet}>• {b}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.education?.length ? (
          <View>
            <Section title="EDUCATION" />
            {data.education.map((edu, i) => (
              <View key={i}>
                <View style={styles.row}>
                  <Text style={styles.jobTitle}>{edu.degree}</Text>
                  <Text style={styles.meta}>{edu.year}</Text>
                </View>
                <Text style={styles.meta}>{edu.school}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.skills?.length ? (
          <View>
            <Section title="SKILLS" />
            <Text style={styles.body}>{data.skills.join(' · ')}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function generatePdf(data: ResumeData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(ResumePDF, { data }) as any);
  return Buffer.from(buffer);
}
