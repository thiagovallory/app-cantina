import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../context/AppContext';

interface ReportsProps {
  open: boolean;
  onClose: () => void;
}

type ReportType = 'pessoas-simples' | 'pessoas-detalhado' | 'sales-summary';
type OutputFormat = 'csv' | 'pdf';
type DetailedCsvRow = Record<string, string | number>;
type PdfCellConfig = {
  content: string;
  colSpan: number;
  styles: Record<string, unknown>;
};

export const Reports: React.FC<ReportsProps> = ({ open, onClose }) => {
  const { people, products, branding } = useApp();
  const [selectedReport, setSelectedReport] = useState<ReportType>('pessoas-simples');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('csv');
  const sortedPeople = [...people].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  const getUnitCost = (costPrice?: number, purchasedQuantity?: number) => {
    if (typeof costPrice !== 'number' || typeof purchasedQuantity !== 'number' || purchasedQuantity <= 0) {
      return 0;
    }

    return costPrice / purchasedQuantity;
  };

  const isSpecialSaleItem = (item: { productId: string; productName: string }) => (
    item.productName === 'Oferta Missionária' ||
    item.productName.includes('Saldo para Missionário') ||
    item.productName.includes('Saldo para Saque') ||
    item.productId === 'encerramento'
  );

  const buildSalesSummaryRows = () => {
    const salesByProduct = new Map<string, { quantity: number; total: number }>();

    people.forEach((person) => {
      person.purchases.forEach((purchase) => {
        purchase.items.forEach((item) => {
          if (isSpecialSaleItem(item)) {
            return;
          }

          const existing = salesByProduct.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += item.total;
            return;
          }

          salesByProduct.set(item.productId, {
            quantity: item.quantity,
            total: item.total
          });
        });
      });
    });

    const rows = products.map((product) => {
      const sales = salesByProduct.get(product.id) || { quantity: 0, total: 0 };
      const unitCost = getUnitCost(product.costPrice, product.purchasedQuantity);
      const roundedUnitCost = Math.round(unitCost * 100) / 100;
      const profit = roundedUnitCost > 0
        ? Math.round((sales.total - (roundedUnitCost * sales.quantity)) * 100) / 100
        : 0;

      return {
        code: product.barcode || '',
        product: cleanTextForPDF(product.name),
        purchasedQuantity: product.purchasedQuantity || 0,
        cost: product.costPrice || 0,
        unitCost: roundedUnitCost,
        price: product.price,
        salesQuantity: sales.quantity,
        salesTotal: sales.total,
        profit,
        stock: product.stock
      };
    });

    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const totalSales = rows.reduce((sum, row) => sum + row.salesTotal, 0);
    const totalProfit = totalSales - totalCost;

    return {
      rows,
      totalCost,
      totalSales,
      totalProfit
    };
  };

  // Remove emojis do texto para PDF
  const cleanTextForPDF = (text: string): string => {
    // Remove emojis e caracteres especiais que não são suportados pelo PDF
    return text.replace(/[\u{1F300}-\u{1FAD6}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  };

  const generatePeopleSimpleCSV = () => {
    const csvData = sortedPeople.map(person => ({
      'ID Personalizado': person.customId ? `="${person.customId}"` : '', // Força texto
      'Nome': person.name,
      'Depósito Inicial': person.initialDeposit.toFixed(2),
      'Total Compras': person.purchases.length,
      'Saldo Atual': person.balance.toFixed(2)
    }));

    const csv = Papa.unparse(csvData, { delimiter: ';' });
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(csv, `${orgSlug}-pessoas-simples.csv`);
  };

  const generatePeopleDetailedCSV = () => {
    const csvData: DetailedCsvRow[] = [];
    
    sortedPeople.forEach(person => {
      csvData.push({
        'ID Personalizado': person.customId || '',
        'Nome': `=== ${person.name.toUpperCase()} ===`,
        'Produto': '',
        'Quantidade': '',
        'Valor': '',
        'Data Compra': '',
        'Hora Compra': ''
      });

      if (person.purchases.length === 0) {
        csvData.push({
          'ID Personalizado': person.customId || '',
          'Nome': person.name,
          'Produto': 'Nenhuma compra',
          'Quantidade': '',
          'Valor': '',
          'Data Compra': '',
          'Hora Compra': ''
        });
      } else {
        person.purchases.forEach(purchase => {
          purchase.items.forEach(item => {
            const purchaseDate = new Date(purchase.date);
            csvData.push({
              'ID Personalizado': person.customId ? `="${person.customId}"` : '',
              'Nome': person.name,
              'Produto': cleanTextForPDF(item.productName), // Remove emojis como no PDF
              'Quantidade': item.quantity,
              'Valor': item.total.toFixed(2),
              'Data Compra': purchaseDate.toLocaleDateString('pt-BR'),
              'Hora Compra': purchaseDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          });
        });
      }

      csvData.push({
        'ID Personalizado': '',
        'Nome': '',
        'Produto': '',
        'Quantidade': '',
        'Valor': '',
        'Data Compra': '',
        'Hora Compra': ''
      });
    });

    const csv = Papa.unparse(csvData, { delimiter: ';' });
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(csv, `${orgSlug}-pessoas-detalhadas.csv`);
  };

  const generateSalesSummaryCSV = () => {
    const { rows, totalCost, totalSales, totalProfit } = buildSalesSummaryRows();
    const csvData: Array<Record<string, string | number>> = rows
      .map((row) => ({
        'Código': row.code ? `="${row.code}"` : '',
        'Produto': row.product,
        'QTD': row.purchasedQuantity,
        'Custo': row.cost.toFixed(2),
        'V. Unit.': row.unitCost > 0 ? row.unitCost.toFixed(2) : '0.00',
        'V. Vend.': row.price.toFixed(2),
        'QTD V.': row.salesQuantity,
        'T. Vend.': row.salesTotal.toFixed(2),
        'Estq.': row.stock,
        'Lucro': row.profit.toFixed(2)
      }))
      .sort((a, b) => parseFloat(b['T. Vend.']) - parseFloat(a['T. Vend.']));

    csvData.unshift({
      'Código': '',
      'Produto': '=== RESUMO GERAL ===',
      'QTD': '',
      'Custo': totalCost.toFixed(2),
      'V. Unit.': '',
      'V. Vend.': '',
      'QTD V.': '',
      'T. Vend.': totalSales.toFixed(2),
      'Estq.': '',
      'Lucro': totalProfit.toFixed(2)
    });

    const csv = Papa.unparse(csvData, { delimiter: ';' });
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    downloadCSV(csv, `${orgSlug}-resumo-vendas.csv`);
  };

  const generatePDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait'
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let yPosition = 18;
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const reportFileSlug = selectedReport === 'sales-summary' ? 'vendas' : selectedReport;
    const fileName = `${orgSlug}-relatorio-${reportFileSlug}-${new Date().toISOString().split('T')[0]}.pdf`;
    const palette = {
      ink: [22, 33, 52] as [number, number, number],
      muted: [92, 104, 128] as [number, number, number],
      accent: [33, 74, 128] as [number, number, number],
      accentSoft: [233, 240, 248] as [number, number, number],
      line: [217, 224, 232] as [number, number, number],
      successSoft: [228, 242, 235] as [number, number, number]
    };
    const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
    const reportTitleMap: Record<ReportType, string> = {
      'pessoas-simples': 'Relatorio de Pessoas',
      'pessoas-detalhado': 'Relatorio de Pessoas com Historico',
      'sales-summary': 'Relatorio de Vendas'
    };

    const drawSummaryCards = (cards: Array<{ label: string; value: string }>) => {
      const gap = 4;
      const cardWidth = (pageWidth - (margin * 2) - (gap * (cards.length - 1))) / cards.length;
      const cardHeight = 20;

      cards.forEach((card, index) => {
        const x = margin + (index * (cardWidth + gap));
        doc.setDrawColor(...palette.line);
        doc.setFillColor(...palette.accentSoft);
        doc.roundedRect(x, yPosition, cardWidth, cardHeight, 3, 3, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...palette.muted);
        doc.text(card.label.toUpperCase(), x + 4, yPosition + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...palette.ink);
        doc.text(card.value, x + 4, yPosition + 14);
      });

      yPosition += cardHeight + 8;
    };

    const getTableTheme = (fontSize = 9) => ({
      margin: { left: margin, right: margin },
      styles: {
        fontSize,
        cellPadding: 2.4,
        lineColor: palette.line,
        lineWidth: 0.2,
        textColor: palette.ink
      },
      headStyles: {
        fillColor: palette.accent,
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold' as const,
        halign: 'left' as const
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] as [number, number, number]
      }
    });

    const addReportHeader = async () => {
      doc.setFillColor(...palette.ink);
      doc.rect(0, 0, pageWidth, 16, 'F');

      let logoWidth = 0;
      let logoHeight = 0;
      const logoTop = 24;

      if (branding.showLogo && branding.logoUrl) {
        try {
          const logoUrl = branding.logoUrl.startsWith('http') || branding.logoUrl.startsWith('blob:') || branding.logoUrl.startsWith('data:')
            ? branding.logoUrl
            : window.location.origin + branding.logoUrl;

          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoUrl;
          });

          const imgRatio = img.width / img.height;
          logoHeight = 24;
          logoWidth = logoHeight * imgRatio;

          if (logoWidth > 42) {
            logoWidth = 42;
            logoHeight = logoWidth / imgRatio;
          }

          doc.addImage(img, 'PNG', margin, logoTop, logoWidth, logoHeight);
        } catch (error) {
          console.error('Erro ao carregar logo:', error);
        }
      }

      const textStartX = logoWidth > 0 ? margin + logoWidth + 6 : margin;
      const headerRightX = pageWidth - margin;
      doc.setTextColor(...palette.muted);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('RELATORIO OPERACIONAL', textStartX, 28);

      doc.setTextColor(...palette.ink);
      doc.setFontSize(19);
      doc.text(branding.organizationName || 'App Cantina', textStartX, 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(...palette.muted);
      doc.text(reportTitleMap[selectedReport], textStartX, 43);

      doc.setDrawColor(...palette.line);
      doc.setFillColor(248, 249, 251);
      doc.roundedRect(headerRightX - 42, 24, 42, 18, 3, 3, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...palette.muted);
      doc.text('EMITIDO EM', headerRightX - 38, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...palette.ink);
      doc.text(new Date().toLocaleDateString('pt-BR'), headerRightX - 38, 37);

      yPosition = Math.max(logoTop + logoHeight, 46) + 10;
    };

    const addPdfFooter = () => {
      const totalPages = doc.getNumberOfPages();

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(110, 110, 110);
        doc.text(fileName, margin, pageHeight - 6);
        doc.text(`${pageNumber}/${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      doc.setTextColor(0, 0, 0);
    };

    await addReportHeader();

    switch (selectedReport) {
      case 'pessoas-simples': {
        drawSummaryCards([
          { label: 'Pessoas', value: String(sortedPeople.length) },
          { label: 'Depositos', value: formatCurrency(sortedPeople.reduce((sum, person) => sum + person.initialDeposit, 0)) },
          { label: 'Saldo Atual', value: formatCurrency(sortedPeople.reduce((sum, person) => sum + person.balance, 0)) }
        ]);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...palette.ink);
        doc.text('Lista de pessoas cadastradas', margin, yPosition);
        yPosition += 7;

        const peopleData = sortedPeople.map(person => [
          person.customId || '',
          person.name,
          formatCurrency(person.initialDeposit),
          person.purchases.length.toString(),
          formatCurrency(person.balance)
        ]);

        autoTable(doc, {
          head: [['ID', 'Nome', 'Depósito', 'Compras', 'Saldo']],
          body: peopleData,
          startY: yPosition,
          ...getTableTheme(9.6),
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 70 },
            2: { halign: 'right' },
            3: { halign: 'center', cellWidth: 22 },
            4: { halign: 'right' }
          }
        });
        break;
      }

      case 'pessoas-detalhado': {
        const totalPurchases = sortedPeople.reduce((sum, person) => sum + person.purchases.length, 0);
        const totalItems = sortedPeople.reduce((sum, person) => (
          sum + person.purchases.reduce((purchaseSum, purchase) => (
            purchaseSum + purchase.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
          ), 0)
        ), 0);

        drawSummaryCards([
          { label: 'Pessoas', value: String(sortedPeople.length) },
          { label: 'Compras', value: String(totalPurchases) },
          { label: 'Itens Vendidos', value: String(totalItems) }
        ]);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...palette.ink);
        doc.text('Historico detalhado de compras por pessoa', margin, yPosition);
        yPosition += 7;

        const detailedData: Array<Array<string | PdfCellConfig>> = [];
        const personHeaderRows = new Set<number>();
        sortedPeople.forEach(person => {
          personHeaderRows.add(detailedData.length);
          detailedData.push([
            {
              content: `${person.customId || 'Sem ID'} • ${person.name}`,
              colSpan: 7,
              styles: {
                halign: 'left',
                fontStyle: 'bold',
                fillColor: palette.accentSoft,
                textColor: palette.ink
              }
            }
          ]);

          if (person.purchases.length === 0) {
            detailedData.push([
              '',
              '',
              'Nenhuma compra',
              '',
              '',
              '',
              ''
            ]);
          } else {
            person.purchases.forEach(purchase => {
              purchase.items.forEach(item => {
                const purchaseDate = new Date(purchase.date);
                detailedData.push([
                  '',
                  '',
                  cleanTextForPDF(item.productName),
                  item.quantity.toString(),
                  `R$ ${item.total.toFixed(2)}`,
                  purchaseDate.toLocaleDateString('pt-BR'),
                  purchaseDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                ]);
              });
            });
          }
        });

        autoTable(doc, {
          head: [['ID', 'Nome', 'Produto', 'QTD', 'Valor', 'Data', 'Hora']],
          body: detailedData,
          startY: yPosition,
          ...getTableTheme(8.8),
          columnStyles: {
            0: { cellWidth: 17 },
            1: { cellWidth: 36 },
            2: { cellWidth: 57 },
            3: { cellWidth: 14, halign: 'center' },
            4: { cellWidth: 24, halign: 'right' },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && personHeaderRows.has(data.row.index)) {
              data.cell.styles.lineWidth = 0;
            }
          }
        });
        break;
      }

      case 'sales-summary': {
        const { rows, totalCost, totalSales, totalProfit } = buildSalesSummaryRows();
        drawSummaryCards([
          { label: 'Custo Total', value: formatCurrency(totalCost) },
          { label: 'Faturamento', value: formatCurrency(totalSales) },
          { label: 'Lucro Total', value: formatCurrency(totalProfit) }
        ]);

        const salesTableData = rows
          .map((row) => [
            row.code || '-',
            row.product,
            row.purchasedQuantity.toString(),
            formatCurrency(row.cost),
            row.unitCost > 0 ? formatCurrency(row.unitCost) : '-',
            formatCurrency(row.price),
            row.salesQuantity.toString(),
            formatCurrency(row.salesTotal),
            row.stock.toString(),
            formatCurrency(row.profit)
          ])
          .sort((a, b) => parseFloat(b[7].replace('R$ ', '')) - parseFloat(a[7].replace('R$ ', '')));

        autoTable(doc, {
          head: [['Código', 'Produto', 'QTD', 'Custo', 'V. Unit.', 'V. Vend.', 'QTD V.', 'T. Vend.', 'Estq.', 'Lucro']],
          body: salesTableData,
          startY: yPosition,
          ...getTableTheme(8.5),
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 19, halign: 'right' },
            4: { cellWidth: 19, halign: 'right' },
            5: { cellWidth: 19, halign: 'right' },
            6: { cellWidth: 15, halign: 'center' },
            7: { cellWidth: 21, halign: 'right' },
            8: { cellWidth: 12, halign: 'center' },
            9: { cellWidth: 21, halign: 'right' }
          }
        });
        break;
      }
    }

    addPdfFooter();
    doc.save(fileName);
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = () => {
    if (outputFormat === 'csv') {
      switch (selectedReport) {
        case 'pessoas-simples':
          generatePeopleSimpleCSV();
          break;
        case 'pessoas-detalhado':
          generatePeopleDetailedCSV();
          break;
        case 'sales-summary':
          generateSalesSummaryCSV();
          break;
      }
    } else {
      generatePDF();
    }
  };

  const getReportDescription = () => {
    switch (selectedReport) {
      case 'pessoas-simples':
        return 'Lista simples com nome, ID, saldo atual e número de compras';
      case 'pessoas-detalhado':
        return 'Lista completa com histórico detalhado de todas as compras';
      case 'sales-summary':
        return 'Resumo das vendas por produto com totais e estatísticas';
      default:
        return '';
    }
  };

  const reports = [
    {
      id: 'pessoas-simples',
      title: 'Pessoas - Lista Simples',
      description: 'Lista básica de pessoas com saldo e informações principais',
      icon: <PeopleIcon />
    },
    {
      id: 'pessoas-detalhado',
      title: 'Pessoas - Com Histórico',
      description: 'Lista completa com histórico detalhado de compras',
      icon: <PeopleIcon />
    },
    {
      id: 'sales-summary',
      title: 'Resumo de Vendas',
      description: 'Estatísticas de vendas por produto e totais gerais',
      icon: <AssessmentIcon />
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          Gerar Relatórios
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          <Alert severity="info">
            Selecione o tipo de relatório e formato desejado. Os arquivos serão baixados automaticamente.
          </Alert>

          <Box>
            <Typography variant="h6" gutterBottom>
              Tipo de Relatório
            </Typography>
            <Stack spacing={2}>
              {reports.map((report) => (
                <Card
                  key={report.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    border: selectedReport === report.id ? 2 : 1,
                    borderColor: selectedReport === report.id ? 'primary.main' : 'divider',
                    bgcolor: selectedReport === report.id ? 'primary.50' : 'background.paper'
                  }}
                  onClick={() => setSelectedReport(report.id as ReportType)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {report.icon}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {report.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {report.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <FormControl>
              <FormLabel>Formato de Saída</FormLabel>
              <RadioGroup
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                row
              >
                <FormControlLabel
                  value="csv"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileDownloadIcon fontSize="small" />
                      CSV (Excel)
                    </Box>
                  }
                />
                <FormControlLabel
                  value="pdf"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PrintIcon fontSize="small" />
                      PDF (Imprimir)
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Alert severity="success">
            <Typography variant="body2">
              <strong>Relatório selecionado:</strong> {getReportDescription()}
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          startIcon={outputFormat === 'csv' ? <FileDownloadIcon /> : <PrintIcon />}
        >
          {outputFormat === 'csv' ? 'Baixar CSV' : 'Gerar PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
