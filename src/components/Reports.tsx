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
    const csvData: any[] = [];
    
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
    const margin = 10;
    let yPosition = 20;
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const reportFileSlug = selectedReport === 'sales-summary' ? 'vendas' : selectedReport;
    const fileName = `${orgSlug}-relatorio-${reportFileSlug}-${new Date().toISOString().split('T')[0]}.pdf`;
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

    // Adiciona logo centralizada se disponível
    if (branding.showLogo && branding.logoUrl) {
      try {
        // Se for URL absoluta ou relativa
        const logoUrl = branding.logoUrl.startsWith('http') || branding.logoUrl.startsWith('blob:') 
          ? branding.logoUrl 
          : window.location.origin + branding.logoUrl;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });

        // Calcula proporções mantendo aspect ratio
        const maxLogoHeight = 35;
        const maxLogoWidth = 60;
        
        // Calcula as dimensões mantendo a proporção
        const imgRatio = img.width / img.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = maxLogoWidth / imgRatio;
        
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = maxLogoHeight * imgRatio;
        }
        
        // Centraliza a logo horizontalmente
        const logoX = (pageWidth - logoWidth) / 2;
        
        // Adiciona a imagem ao PDF centralizada
        doc.addImage(img, 'PNG', logoX, yPosition, logoWidth, logoHeight);
        
        // Ajusta yPosition baseado na altura da logo
        yPosition += logoHeight + 10;
      } catch (error) {
        // Se falhar ao carregar a logo, continua sem ela
        console.error('Erro ao carregar logo:', error);
      }
    }
    
    // Nome da organização centralizado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const orgNameWidth = doc.getTextWidth(branding.organizationName);
    doc.text(branding.organizationName, (pageWidth - orgNameWidth) / 2, yPosition);
    
    yPosition += 10;
    
    // Título do relatório centralizado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    const reportTitle = 'Sistema de Cantina - Relatório de Vendas';
    const titleWidth = doc.getTextWidth(reportTitle);
    doc.text(reportTitle, (pageWidth - titleWidth) / 2, yPosition);
    
    yPosition += 8;
    
    // Data centralizada
    doc.setFontSize(12);
    const dateText = new Date().toLocaleDateString('pt-BR');
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, yPosition);

    yPosition += 20;

    switch (selectedReport) {
      case 'pessoas-simples':
        doc.setFontSize(14);
        doc.text('Lista de Pessoas', margin, yPosition);
        yPosition += 10;

        const peopleData = sortedPeople.map(person => [
          person.customId || '',
          person.name,
          `R$ ${person.initialDeposit.toFixed(2)}`,
          person.purchases.length.toString(),
          `R$ ${person.balance.toFixed(2)}`
        ]);

        autoTable(doc, {
          head: [['ID', 'Nome', 'Depósito', 'Compras', 'Saldo']],
          body: peopleData,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        break;

      case 'pessoas-detalhado':
        doc.setFontSize(14);
        doc.text('Pessoas com Detalhes de Compras', margin, yPosition);
        yPosition += 10;

        const detailedData: any[] = [];
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
                fillColor: [232, 241, 250],
                textColor: [33, 33, 33]
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
          margin: { left: margin, right: margin },
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
          didParseCell: (data) => {
            if (data.section === 'body' && personHeaderRows.has(data.row.index)) {
              data.cell.styles.lineWidth = 0;
            }
          }
        });
        break;

      case 'sales-summary':
        const { rows, totalCost, totalSales, totalProfit } = buildSalesSummaryRows();
        yPosition -= 6;
        const salesSummaryTableWidth = 192;
        const salesSummaryLeftMargin = (pageWidth - salesSummaryTableWidth) / 2;
        const summaryBoxGap = 4;
        const summaryBoxWidth = 58;
        const summaryBoxHeight = 18;
        const summaryRowWidth = (summaryBoxWidth * 3) + (summaryBoxGap * 2);
        const summaryStartX = (pageWidth - summaryRowWidth) / 2;
        const summaryBoxes = [
          { title: 'Custo Total', value: `R$ ${totalCost.toFixed(2)}` },
          { title: 'Faturamento', value: `R$ ${totalSales.toFixed(2)}` },
          { title: 'Lucro Total', value: `R$ ${totalProfit.toFixed(2)}` }
        ];

        summaryBoxes.forEach((box, index) => {
          const boxX = summaryStartX + (index * (summaryBoxWidth + summaryBoxGap));
          doc.setDrawColor(210, 210, 210);
          doc.setFillColor(248, 249, 251);
          doc.roundedRect(boxX, yPosition, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(box.title, boxX + (summaryBoxWidth / 2), yPosition + 6, { align: 'center' });

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.text(box.value, boxX + (summaryBoxWidth / 2), yPosition + 13, { align: 'center' });
        });

        yPosition += summaryBoxHeight + 10;

        const salesTableData = rows
          .map((row) => [
            row.code || '-',
            row.product,
            row.purchasedQuantity.toString(),
            `R$ ${row.cost.toFixed(2)}`,
            row.unitCost > 0 ? `R$ ${row.unitCost.toFixed(2)}` : '-',
            `R$ ${row.price.toFixed(2)}`,
            row.salesQuantity.toString(),
            `R$ ${row.salesTotal.toFixed(2)}`,
            row.stock.toString(),
            `R$ ${row.profit.toFixed(2)}`
          ])
          .sort((a, b) => parseFloat(b[7].replace('R$ ', '')) - parseFloat(a[7].replace('R$ ', '')));

        autoTable(doc, {
          head: [['Código', 'Produto', 'QTD', 'Custo', 'V. Unit.', 'V. Vend.', 'QTD V.', 'T. Vend.', 'Estq.', 'Lucro']],
          body: salesTableData,
          startY: yPosition,
          margin: { left: salesSummaryLeftMargin, right: salesSummaryLeftMargin },
          tableWidth: salesSummaryTableWidth,
          styles: { fontSize: 9, cellPadding: 1.6 },
          headStyles: { fillColor: [66, 139, 202], fontSize: 9, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 27 }, // Código
            1: { cellWidth: 42 }, // Produto
            2: { cellWidth: 11 }, // QTD
            3: { cellWidth: 16 }, // Custo
            4: { cellWidth: 17 }, // V. Unit.
            5: { cellWidth: 17 }, // V. Vend.
            6: { cellWidth: 14 }, // QTD V.
            7: { cellWidth: 19 }, // T. Vend.
            8: { cellWidth: 12 }, // Estq.
            9: { cellWidth: 17 } // Lucro
          }
        });
        break;
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
