import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  Chip,
  Checkbox,
  ListItemButton
} from '@mui/material';
import {
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  VolunteerActivism as VolunteerActivismIcon,
  DoneAll as DoneAllIcon,
  Deselect as DeselectIcon
} from '@mui/icons-material';
import Papa from 'papaparse';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../context/AppContext';

interface EncerrarAcampamentoProps {
  open: boolean;
  onClose: () => void;
}

type BalanceAction = 'saque' | 'missionario';
type ReportAsset = {
  fileName: string;
  data: Blob | string;
};

export const EncerrarAcampamento: React.FC<EncerrarAcampamentoProps> = ({ open, onClose }) => {
  const { people, products, branding, encerrarAcampamento } = useApp();
  const [step, setStep] = useState<'confirm' | 'balance-choice' | 'processing' | 'completed'>('confirm');
  const [balanceAction, setBalanceAction] = useState<BalanceAction>('saque');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    peopleWithBalance: number;
    totalBalance: number;
    productsCleared: number;
    reportsGenerated: string[];
    selectedCount: number;
    selectedTotalBalance: number;
    remainingCount: number;
    remainingTotalBalance: number;
  } | null>(null);
  const normalizeCurrency = (value: number) => Math.round(value * 100) / 100;
  const hasPositiveBalance = (value: number) => normalizeCurrency(value) > 0;

  // Calcular pessoas com saldo positivo e total
  const peopleWithPositiveBalance = people.filter(person => hasPositiveBalance(person.balance));
  const totalPositiveBalance = normalizeCurrency(
    peopleWithPositiveBalance.reduce((sum, person) => sum + normalizeCurrency(person.balance), 0)
  );
  const remainingBalanceAction: BalanceAction = balanceAction === 'saque' ? 'missionario' : 'saque';
  const selectedPeopleSet = new Set(selectedPersonIds);
  const selectedPeople = peopleWithPositiveBalance.filter(person => selectedPeopleSet.has(person.id));
  const unselectedPeople = peopleWithPositiveBalance.filter(person => !selectedPeopleSet.has(person.id));
  const selectedTotalBalance = normalizeCurrency(
    selectedPeople.reduce((sum, person) => sum + normalizeCurrency(person.balance), 0)
  );
  const unselectedTotalBalance = normalizeCurrency(
    unselectedPeople.reduce((sum, person) => sum + normalizeCurrency(person.balance), 0)
  );
  const getUnitCost = (costPrice?: number, purchasedQuantity?: number) => {
    if (typeof costPrice !== 'number' || typeof purchasedQuantity !== 'number' || purchasedQuantity <= 0) {
      return 0;
    }

    return costPrice / purchasedQuantity;
  };
  const getPersonBalanceAction = (personId: string): BalanceAction => (
    selectedPeopleSet.has(personId) ? balanceAction : remainingBalanceAction
  );
  const cleanTextForPDF = (text: string): string => (
    text.replace(/[\u{1F300}-\u{1FAD6}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
  );
  const getOrgSlug = () => branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const getTimestamp = () => new Date().toISOString().split('T')[0];
  const buildPeopleSimpleData = () => people.map((person) => ({
    'ID': person.customId || '',
    'Nome': person.name,
    'Depósito Inicial': person.initialDeposit.toFixed(2),
    'Total Compras': person.purchases.length,
    'Total Gasto': person.purchases.reduce((sum, purchase) => sum + purchase.total, 0).toFixed(2),
    'Saldo Final': person.balance.toFixed(2),
    'Destino Saldo': hasPositiveBalance(person.balance)
      ? (getPersonBalanceAction(person.id) === 'saque' ? 'Saque' : 'Missionário')
      : ''
  }));
  const buildPeopleDetailedData = () => {
    const rows: Array<Record<string, string | number>> = [];

    people.forEach((person) => {
      if (person.purchases.length === 0) {
        rows.push({
          'ID': person.customId || '',
          'Nome': person.name,
          'Produto': 'Nenhuma compra',
          'QTD': '',
          'Valor': '',
          'Data': '',
          'Hora': '',
          'Depósito Inicial': person.initialDeposit.toFixed(2),
          'Saldo Final': person.balance.toFixed(2),
          'Destino Saldo': hasPositiveBalance(person.balance)
            ? (getPersonBalanceAction(person.id) === 'saque' ? 'Saque' : 'Missionário')
            : ''
        });
        return;
      }

      person.purchases.forEach((purchase) => {
        const purchaseDate = new Date(purchase.date);
        purchase.items.forEach((item) => {
          rows.push({
            'ID': person.customId || '',
            'Nome': person.name,
            'Produto': item.productName,
            'QTD': item.quantity,
            'Valor': item.total.toFixed(2),
            'Data': purchaseDate.toLocaleDateString('pt-BR'),
            'Hora': purchaseDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            'Depósito Inicial': person.initialDeposit.toFixed(2),
            'Saldo Final': person.balance.toFixed(2),
            'Destino Saldo': hasPositiveBalance(person.balance)
              ? (getPersonBalanceAction(person.id) === 'saque' ? 'Saque' : 'Missionário')
              : ''
          });
        });
      });
    });

    return rows;
  };
  const buildProductSummaryData = () => products.map((product) => {
    const unitCost = getUnitCost(product.costPrice, product.purchasedQuantity);

    return {
      'Código': product.barcode || '',
      'Produto': product.name,
      'Qtd Comprada': product.purchasedQuantity || 0,
      'Custo': (product.costPrice || 0).toFixed(2),
      'Valor Unitário': unitCost > 0 ? unitCost.toFixed(2) : '0.00',
      'Preço': product.price.toFixed(2),
      'Estoque': product.stock
    };
  });
  const buildSalesSummaryData = () => {
    const rows = products.map((product) => {
      let salesQuantity = 0;
      let salesTotal = 0;

      people.forEach((person) => {
        person.purchases.forEach((purchase) => {
          purchase.items.forEach((item) => {
            const isSpecialTransaction =
              item.productName === 'Oferta Missionária' ||
              item.productName.includes('Saldo para Missionário') ||
              item.productName.includes('Saldo para Saque') ||
              item.productId === 'encerramento';

            if (!isSpecialTransaction && item.productId === product.id) {
              salesQuantity += item.quantity;
              salesTotal += item.total;
            }
          });
        });
      });

      const unitCost = getUnitCost(product.costPrice, product.purchasedQuantity);
      const roundedUnitCost = Math.round(unitCost * 100) / 100;
      const profit = roundedUnitCost > 0
        ? Math.round(((product.price - roundedUnitCost) * salesQuantity) * 100) / 100
        : 0;

      return {
        'Código': product.barcode || '',
        'Produto': product.name,
        'QTD': product.purchasedQuantity || 0,
        'Custo': (product.costPrice || 0).toFixed(2),
        'V. Unit.': roundedUnitCost > 0 ? roundedUnitCost.toFixed(2) : '0.00',
        'V. Vend.': product.price.toFixed(2),
        'QTD V.': salesQuantity,
        'T. Vend.': salesTotal.toFixed(2),
        'Estq.': product.stock,
        'Lucro': profit.toFixed(2)
      };
    });

    const totalCost = rows.reduce((sum, row) => sum + parseFloat(String(row['Custo'])), 0);
    const totalSales = rows.reduce((sum, row) => sum + parseFloat(String(row['T. Vend.'])), 0);
    const totalProfit = rows.reduce((sum, row) => sum + parseFloat(String(row['Lucro'])), 0);

    return { rows, totalCost, totalSales, totalProfit };
  };
  const downloadBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const downloadReportsZip = async (assets: ReportAsset[]) => {
    const zip = new JSZip();
    assets.forEach((asset) => {
      zip.file(asset.fileName, asset.data);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${getOrgSlug()}-encerramento-relatorios-${getTimestamp()}.zip`);
  };

  const handleConfirmStart = () => {
    if (peopleWithPositiveBalance.length > 0) {
      setSelectedPersonIds(peopleWithPositiveBalance.map(person => person.id));
      setStep('balance-choice');
    } else {
      setStep('processing');
      processEncerramento(); // Não importa qual escolher se não há saldos
    }
  };

  const handleBalanceChoice = () => {
    setStep('processing');
    processEncerramento();
  };

  const togglePersonSelection = (personId: string) => {
    setSelectedPersonIds(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    );
  };

  const selectAllPeople = () => {
    setSelectedPersonIds(peopleWithPositiveBalance.map(person => person.id));
  };

  const clearSelectedPeople = () => {
    setSelectedPersonIds([]);
  };

  const processEncerramento = async () => {
    setIsProcessing(true);
    
    try {
      // Gerar relatórios antes de limpar os dados
      const reportsGenerated: string[] = [];
      const reportAssets: ReportAsset[] = [];
      
      // Gerar todos os relatórios em CSV
      await generateFinalReportsCSV(reportAssets, reportsGenerated);

      // Gerar relatórios auxiliares em PDF
      await generateSupportReportsPDF(reportAssets, reportsGenerated);
      
      // Gerar todos os relatórios em PDF  
      await generateFinalReportsPDF(reportAssets, reportsGenerated);

      await downloadReportsZip(reportAssets);
      
      // Encerrar acampamento (limpar saldos e estoque)
      await encerrarAcampamento(
        peopleWithPositiveBalance.length > 0
          ? {
              selectedPersonIds,
              selectedBalanceAction: balanceAction,
              remainingBalanceAction
            }
          : {
              balanceAction: 'saque'
            }
      );
      
      setResults({
        peopleWithBalance: peopleWithPositiveBalance.length,
        totalBalance: totalPositiveBalance,
        productsCleared: products.filter(p => p.stock > 0).length,
        reportsGenerated,
        selectedCount: selectedPeople.length,
        selectedTotalBalance,
        remainingCount: unselectedPeople.length,
        remainingTotalBalance: unselectedTotalBalance
      });
      
      setStep('completed');
    } catch (error) {
      console.error('Erro ao encerrar acampamento:', error);
      alert('Erro ao encerrar acampamento. Tente novamente.');
    }
    
    setIsProcessing(false);
  };

  const generateFinalReportsCSV = async (reportAssets: ReportAsset[], reportsGenerated: string[]) => {
    const timestamp = getTimestamp();
    const orgSlug = getOrgSlug();
    const peopleSimpleData = buildPeopleSimpleData();
    const peopleDetailedData = buildPeopleDetailedData();
    const productsData = buildProductSummaryData();
    const { rows: salesRows, totalSales } = buildSalesSummaryData();

    reportAssets.push({
      fileName: `${orgSlug}-encerramento-pessoas-simples-${timestamp}.csv`,
      data: '\uFEFF' + Papa.unparse(peopleSimpleData, { delimiter: ';' })
    });
    reportsGenerated.push(`Pessoas Simples (${peopleSimpleData.length} registros)`);

    reportAssets.push({
      fileName: `${orgSlug}-encerramento-pessoas-completo-${timestamp}.csv`,
      data: '\uFEFF' + Papa.unparse(peopleDetailedData, { delimiter: ';' })
    });
    reportsGenerated.push(`Pessoas Completo (${peopleDetailedData.length} registros)`);

    reportAssets.push({
      fileName: `${orgSlug}-encerramento-produtos-${timestamp}.csv`,
      data: '\uFEFF' + Papa.unparse(productsData, { delimiter: ';' })
    });
    reportsGenerated.push(`Produtos (${productsData.length} itens)`);

    reportAssets.push({
      fileName: `${orgSlug}-encerramento-resumo-vendas-${timestamp}.csv`,
      data: '\uFEFF' + Papa.unparse(salesRows, { delimiter: ';' })
    });
    reportsGenerated.push(`Resumo de Vendas (R$ ${totalSales.toFixed(2)})`);
  };

  const generateSupportReportsPDF = async (reportAssets: ReportAsset[], reportsGenerated: string[]) => {
    const timestamp = getTimestamp();
    const orgSlug = getOrgSlug();
    const peopleSimpleData = buildPeopleSimpleData();
    const peopleDetailedData = buildPeopleDetailedData();
    const productsData = buildProductSummaryData();
    const { rows: salesRows, totalCost, totalSales, totalProfit } = buildSalesSummaryData();
    const createBaseDoc = (fileName: string) => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let y = 20;

      const addFooter = () => {
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

      return { doc, margin, y, addFooter };
    };

    {
      const fileName = `${orgSlug}-encerramento-pessoas-simples-${timestamp}.pdf`;
      const { doc, margin, addFooter } = createBaseDoc(fileName);
      let y = 20;
      if (branding.showLogo && branding.logoUrl) {
        try {
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
          const maxLogoHeight = 35;
          const maxLogoWidth = 60;
          const imgRatio = img.width / img.height;
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoWidth / imgRatio;
          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * imgRatio;
          }
          const logoX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;
          doc.addImage(img, 'PNG', logoX, y, logoWidth, logoHeight);
          y += logoHeight + 10;
        } catch (error) {
          console.warn('Nao foi possivel carregar o logo:', error);
        }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanTextForPDF(branding.organizationName), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(15);
      doc.setFont('helvetica', 'normal');
      doc.text('Pessoas - Lista Simples', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(11);
      doc.text(new Date().toLocaleDateString('pt-BR'), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 12;
      autoTable(doc, {
        head: [['ID', 'Nome', 'Depósito Inicial', 'Total Compras', 'Total Gasto', 'Saldo Final', 'Destino Saldo']],
        body: peopleSimpleData.map((row) => [
          String(row['ID']),
          String(row['Nome']),
          `R$ ${row['Depósito Inicial']}`,
          String(row['Total Compras']),
          `R$ ${row['Total Gasto']}`,
          `R$ ${row['Saldo Final']}`,
          String(row['Destino Saldo'])
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      addFooter();
      reportAssets.push({ fileName, data: doc.output('blob') });
      reportsGenerated.push('Pessoas Simples PDF');
    }

    {
      const fileName = `${orgSlug}-encerramento-pessoas-completo-${timestamp}.pdf`;
      const { doc, margin, addFooter } = createBaseDoc(fileName);
      let y = 20;
      if (branding.showLogo && branding.logoUrl) {
        try {
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
          const maxLogoHeight = 35;
          const maxLogoWidth = 60;
          const imgRatio = img.width / img.height;
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoWidth / imgRatio;
          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * imgRatio;
          }
          const logoX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;
          doc.addImage(img, 'PNG', logoX, y, logoWidth, logoHeight);
          y += logoHeight + 10;
        } catch (error) {
          console.warn('Nao foi possivel carregar o logo:', error);
        }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanTextForPDF(branding.organizationName), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(15);
      doc.setFont('helvetica', 'normal');
      doc.text('Pessoas - Com Historico', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(11);
      doc.text(new Date().toLocaleDateString('pt-BR'), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 12;
      autoTable(doc, {
        head: [['ID', 'Nome', 'Produto', 'QTD', 'Valor', 'Data', 'Hora', 'Saldo Final', 'Destino']],
        body: peopleDetailedData.map((row) => [
          String(row['ID']),
          String(row['Nome']),
          cleanTextForPDF(String(row['Produto'])),
          String(row['QTD']),
          row['Valor'] ? `R$ ${row['Valor']}` : '',
          String(row['Data']),
          String(row['Hora']),
          `R$ ${row['Saldo Final']}`,
          String(row['Destino Saldo'])
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      addFooter();
      reportAssets.push({ fileName, data: doc.output('blob') });
      reportsGenerated.push('Pessoas Completo PDF');
    }

    {
      const fileName = `${orgSlug}-encerramento-produtos-${timestamp}.pdf`;
      const { doc, margin, addFooter } = createBaseDoc(fileName);
      let y = 20;
      if (branding.showLogo && branding.logoUrl) {
        try {
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
          const maxLogoHeight = 35;
          const maxLogoWidth = 60;
          const imgRatio = img.width / img.height;
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoWidth / imgRatio;
          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * imgRatio;
          }
          const logoX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;
          doc.addImage(img, 'PNG', logoX, y, logoWidth, logoHeight);
          y += logoHeight + 10;
        } catch (error) {
          console.warn('Nao foi possivel carregar o logo:', error);
        }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanTextForPDF(branding.organizationName), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(15);
      doc.setFont('helvetica', 'normal');
      doc.text('Produtos', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(11);
      doc.text(new Date().toLocaleDateString('pt-BR'), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 12;
      autoTable(doc, {
        head: [['Código', 'Produto', 'Qtd Comprada', 'Custo', 'Valor Unitário', 'Preço', 'Estoque']],
        body: productsData.map((row) => [
          String(row['Código']),
          cleanTextForPDF(String(row['Produto'])),
          String(row['Qtd Comprada']),
          `R$ ${row['Custo']}`,
          `R$ ${row['Valor Unitário']}`,
          `R$ ${row['Preço']}`,
          String(row['Estoque'])
        ]),
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      addFooter();
      reportAssets.push({ fileName, data: doc.output('blob') });
      reportsGenerated.push('Produtos PDF');
    }

    {
      const fileName = `${orgSlug}-encerramento-resumo-vendas-${timestamp}.pdf`;
      const { doc, margin, addFooter } = createBaseDoc(fileName);
      let y = 20;
      if (branding.showLogo && branding.logoUrl) {
        try {
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
          const maxLogoHeight = 35;
          const maxLogoWidth = 60;
          const imgRatio = img.width / img.height;
          let logoWidth = maxLogoWidth;
          let logoHeight = maxLogoWidth / imgRatio;
          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight;
            logoWidth = maxLogoHeight * imgRatio;
          }
          const logoX = (doc.internal.pageSize.getWidth() - logoWidth) / 2;
          doc.addImage(img, 'PNG', logoX, y, logoWidth, logoHeight);
          y += logoHeight + 10;
        } catch (error) {
          console.warn('Nao foi possivel carregar o logo:', error);
        }
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanTextForPDF(branding.organizationName), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 10;
      doc.setFontSize(15);
      doc.setFont('helvetica', 'normal');
      doc.text('Resumo de Vendas', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(11);
      doc.text(new Date().toLocaleDateString('pt-BR'), doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 12;
      autoTable(doc, {
        head: [['Código', 'Produto', 'QTD', 'Custo', 'V. Unit.', 'V. Vend.', 'QTD V.', 'T. Vend.', 'Estq.', 'Lucro']],
        body: salesRows.map((row) => [
          String(row['Código']),
          cleanTextForPDF(String(row['Produto'])),
          String(row['QTD']),
          `R$ ${row['Custo']}`,
          `R$ ${row['V. Unit.']}`,
          `R$ ${row['V. Vend.']}`,
          String(row['QTD V.']),
          `R$ ${row['T. Vend.']}`,
          String(row['Estq.']),
          `R$ ${row['Lucro']}`
        ]),
        startY: y + 14,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] }
      });
      doc.setFontSize(10);
      doc.text(`Custo Total: R$ ${totalCost.toFixed(2)}   Faturamento: R$ ${totalSales.toFixed(2)}   Lucro Total: R$ ${totalProfit.toFixed(2)}`, margin, y);
      addFooter();
      reportAssets.push({ fileName, data: doc.output('blob') });
      reportsGenerated.push('Resumo de Vendas PDF');
    }
  };

  const generateFinalReportsPDF = async (reportAssets: ReportAsset[], reportsGenerated: string[]) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleDateString('pt-BR');
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    const orgSlug = branding.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${orgSlug}-encerramento-final-${new Date().toISOString().split('T')[0]}.pdf`;
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
    const totalSaque = peopleWithPositiveBalance
      .filter((person) => getPersonBalanceAction(person.id) === 'saque')
      .reduce((sum, person) => sum + person.balance, 0);
    const totalMissionario = peopleWithPositiveBalance
      .filter((person) => getPersonBalanceAction(person.id) === 'missionario')
      .reduce((sum, person) => sum + person.balance, 0);
    const saqueCount = peopleWithPositiveBalance.filter((person) => getPersonBalanceAction(person.id) === 'saque').length;
    const missionarioCount = peopleWithPositiveBalance.filter((person) => getPersonBalanceAction(person.id) === 'missionario').length;

    // Header principal com branding
    let currentY = yPosition;
    
    // Adicionar logo se configurado
    if (branding.showLogo && branding.logoUrl) {
      try {
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

        const maxLogoHeight = 35;
        const maxLogoWidth = 60;
        const imgRatio = img.width / img.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = maxLogoWidth / imgRatio;

        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = maxLogoHeight * imgRatio;
        }

        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(img, 'PNG', logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 10;
      } catch (error) {
        console.warn('Não foi possível carregar o logo:', error);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanTextForPDF(branding.organizationName), pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('RELATÓRIO FINAL DE ENCERRAMENTO', pageWidth / 2, currentY, { align: 'center' });
    doc.setFontSize(12);
    currentY += 10;
    doc.text(`Data: ${timestamp}`, pageWidth / 2, currentY, { align: 'center' });
    yPosition = currentY + 15;

    // Calcular estatísticas de vendas para o resumo
    const salesStats = new Map<string, { quantity: number; total: number; name: string; price: number }>();
    let grandTotalSales = 0;
    let grandTotalProfit = 0;
    let totalMissionaryOffers = 0;

    people.forEach(person => {
      person.purchases.forEach(purchase => {
        purchase.items.forEach(item => {
          const isMissionaryOffer = item.productName === 'Oferta Missionária';
          const isMissionaryBalanceTransfer = item.productName.includes('Saldo para Missionário');
          const isWithdrawalBalanceTransfer = item.productName.includes('Saldo para Saque');
          const isClosingEntry = item.productId === 'encerramento';
          const isSpecialTransaction = isMissionaryOffer || isMissionaryBalanceTransfer || isWithdrawalBalanceTransfer || isClosingEntry;

          if (isMissionaryOffer || isMissionaryBalanceTransfer) {
            totalMissionaryOffers += item.total;
          }

          if (!isSpecialTransaction) {
            grandTotalSales += item.total;
            
            const product = products.find(p => p.id === item.productId);
            const unitCost = getUnitCost(product?.costPrice, product?.purchasedQuantity);
            if (product && unitCost > 0) {
              const profit = (product.price - unitCost) * item.quantity;
              grandTotalProfit += profit;
            }
            
            if (salesStats.has(item.productId)) {
              const existing = salesStats.get(item.productId)!;
              existing.quantity += item.quantity;
              existing.total += item.total;
            } else {
              salesStats.set(item.productId, {
                name: item.productName,
                quantity: item.quantity,
                total: item.total,
                price: item.price
              });
            }
          }
        });
      });
    });

    // Resumo geral
    doc.setFontSize(14);
    doc.text('RESUMO GERAL', margin, yPosition);
    yPosition += 15;

    const summaryData = [
      ['Total de Pessoas', people.length.toString()],
      ['Pessoas com Saldo', peopleWithPositiveBalance.length.toString()],
      ['Total de Saldos Restantes', `R$ ${totalPositiveBalance.toFixed(2)}`],
      ['Total de Vendas Realizadas', `R$ ${grandTotalSales.toFixed(2)}`],
      ['Total de Ofertas para Missões', `R$ ${totalMissionaryOffers.toFixed(2)}`],
      ['Total Geral Missionário', `R$ ${(totalMissionaryOffers + totalMissionario).toFixed(2)}`],
      ['Total de Lucro Calculado', grandTotalProfit > 0 ? `R$ ${grandTotalProfit.toFixed(2)}` : 'N/A'],
      ['Total de Produtos', products.length.toString()],
      ['Total de Saque', `${saqueCount} pessoas - R$ ${totalSaque.toFixed(2)}`],
      ['Total de Saldo para Missionário', `${missionarioCount} pessoas - R$ ${totalMissionario.toFixed(2)}`]
    ];

    autoTable(doc, {
      head: [['Item', 'Valor']],
      body: summaryData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Pessoas com saldo positivo (se houver)
    if (peopleWithPositiveBalance.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 25;
      }

      doc.setFontSize(14);
      doc.text('PESSOAS COM SALDO POSITIVO', margin, yPosition);
      yPosition += 10;

      const balanceData = peopleWithPositiveBalance.map(person => [
        person.customId || '',
        person.name,
        `R$ ${person.balance.toFixed(2)}`,
        getPersonBalanceAction(person.id) === 'saque' ? 'Saque' : 'Missionário'
      ]);

      autoTable(doc, {
        head: [['ID', 'Nome', 'Saldo', 'Destino']],
        body: balanceData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }

    // PRODUTOS E VENDAS REALIZADAS
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 25;
    }

    doc.setFontSize(14);
    doc.text('PRODUTOS E VENDAS REALIZADAS', margin, yPosition);
    yPosition += 10;

    // Preparar dados dos produtos com vendas
    const productsData: any[] = [];
    let totalGeralVendas = 0;
    let totalGeralLucro = 0;

    products.forEach(product => {
      const salesData = salesStats.get(product.id);
      const quantitySum = salesData ? salesData.quantity : 0;
      const totalSum = salesData ? salesData.total : 0;

      const unitCost = getUnitCost(product.costPrice, product.purchasedQuantity);
      const roundedUnitCost = Math.round(unitCost * 100) / 100;
      const profit = roundedUnitCost > 0
        ? Math.round(((product.price - roundedUnitCost) * quantitySum) * 100) / 100
        : 0;
      const remainingQuantity = product.stock;
      
      productsData.push([
        product.barcode || '-',
        product.name,
        quantitySum.toString(),
        `R$ ${totalSum.toFixed(2)}`,
        `R$ ${product.price.toFixed(2)}`,
        remainingQuantity.toString(),
        roundedUnitCost > 0 ? `R$ ${profit.toFixed(2)}` : '-'
      ]);
      
      totalGeralVendas += totalSum;
      totalGeralLucro += profit;
    });

    // Adicionar linha de total
    productsData.push([
      '',
      'TOTAL GERAL',
      '',
      `R$ ${totalGeralVendas.toFixed(2)}`,
      '',
      '',
      totalGeralLucro > 0 ? `R$ ${totalGeralLucro.toFixed(2)}` : '-'
    ]);

    autoTable(doc, {
      head: [['Código', 'Produto', 'Qtd Vendida', 'Total Vendas', 'Preço Unit.', 'Sobrou', 'Lucro']],
      body: productsData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      columnStyles: {
        0: { cellWidth: 25 }, // Código
        1: { cellWidth: 40 }, // Produto  
        2: { cellWidth: 22 }, // Qtd
        3: { cellWidth: 28 }, // Total Vendas
        4: { cellWidth: 22 }, // Preço
        5: { cellWidth: 20 }, // Sobrou
        6: { cellWidth: 25 }  // Lucro
      },
      didParseCell: function(data) {
        // Destacar linha de total
        if (data.row.index === productsData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    addPdfFooter();
    reportAssets.push({ fileName, data: doc.output('blob') });
    reportsGenerated.push(`Relatório Final PDF`);
  };

  const handleClose = () => {
    setStep('confirm');
    setBalanceAction('saque');
    setSelectedPersonIds([]);
    setResults(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={step === 'processing' ? undefined : handleClose} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={step === 'processing'}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Encerrar Acampamento
      </DialogTitle>
      
      <DialogContent>
        {step === 'confirm' && (
          <Stack spacing={3}>
            <Alert severity="warning">
              <Typography variant="h6" gutterBottom>
                ⚠️ ATENÇÃO: Esta ação não pode ser desfeita!
              </Typography>
              <Typography variant="body1">
                O encerramento do acampamento irá:
              </Typography>
              <ul>
                <li>Registrar no histórico de cada pessoa o destino do saldo</li>
                <li>Zerar todos os saldos das pessoas</li>
                <li>Zerar todo o estoque de produtos</li>
                <li>Gerar relatórios finais completos</li>
              </ul>
            </Alert>

            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                📊 Situação Atual:
              </Typography>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Pessoas:</Typography>
                  <Typography variant="h6">{people.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Com Saldo:</Typography>
                  <Typography variant="h6" color="primary">{peopleWithPositiveBalance.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Saldos:</Typography>
                  <Typography variant="h6" color="primary">R$ {totalPositiveBalance.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Produtos:</Typography>
                  <Typography variant="h6">{products.length}</Typography>
                </Box>
              </Stack>
            </Box>

            {peopleWithPositiveBalance.length > 0 && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>{peopleWithPositiveBalance.length} pessoas</strong> possuem saldo positivo totalizando <strong>R$ {totalPositiveBalance.toFixed(2)}</strong>.
                  <br />
                  Você precisará definir o destino desses saldos na próxima etapa.
                </Typography>
              </Alert>
            )}
          </Stack>
        )}

        {step === 'balance-choice' && (
          <Stack spacing={3}>
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                💰 Destino dos Saldos Positivos
              </Typography>
              <Typography variant="body1">
                {peopleWithPositiveBalance.length} pessoas possuem saldo positivo (Total: R$ {totalPositiveBalance.toFixed(2)}).
              </Typography>
            </Alert>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Ação para as pessoas selecionadas
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2
                }}
              >
                <Box
                  onClick={() => setBalanceAction('saque')}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: balanceAction === 'saque' ? 'success.main' : 'divider',
                    bgcolor: balanceAction === 'saque' ? 'success.50' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AttachMoneyIcon color={balanceAction === 'saque' ? 'success' : 'action'} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: balanceAction === 'saque' ? 'success.main' : 'text.secondary' }}
                    >
                      Permitir Saque
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Os saldos ficam disponíveis para retirada pelas pessoas selecionadas.
                  </Typography>
                </Box>

                <Box
                  onClick={() => setBalanceAction('missionario')}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '2px solid',
                    borderColor: balanceAction === 'missionario' ? 'success.main' : 'divider',
                    bgcolor: balanceAction === 'missionario' ? 'success.50' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: 2
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <VolunteerActivismIcon color={balanceAction === 'missionario' ? 'success' : 'action'} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: balanceAction === 'missionario' ? 'success.main' : 'text.secondary' }}
                    >
                      Doação para Missionário
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Os saldos das pessoas selecionadas serão registrados como doação missionária.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
                Pessoas selecionadas: <strong>{balanceAction === 'saque' ? 'Permitir Saque' : 'Doação para Missionário'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                A lista já vem toda selecionada. Desmarque apenas quem deve ficar com a opção oposta:
                <strong> {remainingBalanceAction === 'saque' ? 'Permitir Saque' : 'Doação para Missionário'}</strong>.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Button size="small" variant="outlined" startIcon={<DoneAllIcon />} onClick={selectAllPeople}>
                  Selecionar todos
                </Button>
                <Button size="small" variant="text" startIcon={<DeselectIcon />} onClick={clearSelectedPeople}>
                  Limpar seleção
                </Button>
              </Stack>
              <List
                dense
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  overflow: 'hidden'
                }}
              >
                {peopleWithPositiveBalance.map((person, index) => (
                  <ListItem
                    key={person.id}
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedPeopleSet.has(person.id)}
                        onChange={() => togglePersonSelection(person.id)}
                      />
                    }
                  >
                    <ListItemButton
                      onClick={() => togglePersonSelection(person.id)}
                      sx={{
                        py: 0,
                        pr: 7,
                        borderBottom: index === peopleWithPositiveBalance.length - 1 ? 'none' : '1px solid',
                        borderColor: 'divider',
                        borderTopLeftRadius: index === 0 ? 4 : 0,
                        borderTopRightRadius: index === 0 ? 4 : 0,
                        borderBottomLeftRadius: index === peopleWithPositiveBalance.length - 1 ? 4 : 0,
                        borderBottomRightRadius: index === peopleWithPositiveBalance.length - 1 ? 4 : 0,
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 2,
                              pr: 1
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {person.name} {person.customId ? `(${person.customId})` : ''}
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                flexShrink: 0
                              }}
                            >
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ width: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                              >
                                R$ {person.balance.toFixed(2)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ width: 104 }}
                              >
                                {selectedPeopleSet.has(person.id)
                                  ? (balanceAction === 'saque' ? 'Saque' : 'Missionário')
                                  : (remainingBalanceAction === 'saque' ? 'Saque' : 'Missionário')}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                <Chip label={`${selectedPeople.length} selecionados • R$ ${selectedTotalBalance.toFixed(2)} • ${balanceAction === 'saque' ? 'Saque' : 'Missionário'}`} color="primary" />
                <Chip label={`${unselectedPeople.length} não selecionados • R$ ${unselectedTotalBalance.toFixed(2)} • ${remainingBalanceAction === 'saque' ? 'Saque' : 'Missionário'}`} color="secondary" />
              </Stack>
            </Box>
          </Stack>
        )}

        {step === 'processing' && (
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Encerrando Acampamento...
              </Typography>
              <LinearProgress sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {isProcessing 
                  ? 'Gerando relatórios finais e limpando dados...' 
                  : 'Processamento concluído!'
                }
              </Typography>
            </Box>
          </Stack>
        )}

        {step === 'completed' && results && (
          <Stack spacing={2.5}>
            <Alert
              severity="success"
              sx={{
                borderRadius: 2,
                '& .MuiAlert-message': {
                  width: '100%'
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Acampamento Encerrado com Sucesso!
              </Typography>
            </Alert>

            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 600 }}>
                <AssignmentIcon color="action" />
                Resumo do Encerramento
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.25
                }}
              >
                <Chip
                  label={`${results.peopleWithBalance} pessoas zeradas`}
                  color="primary"
                  sx={{ height: 'auto', minHeight: 52, borderRadius: 2, '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', py: 1.25, fontSize: '0.98rem', lineHeight: 1.35 } }}
                />
                <Chip
                  label={`${results.productsCleared} produtos zerados`}
                  color="default"
                  sx={{ height: 'auto', minHeight: 52, borderRadius: 2, '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', py: 1.25, fontSize: '0.98rem', lineHeight: 1.35 } }}
                />
                <Chip
                  label={`${results.selectedCount} selecionados • R$ ${results.selectedTotalBalance.toFixed(2)} • ${balanceAction === 'saque' ? 'saque' : 'missionário'}`}
                  color="secondary"
                  sx={{ height: 'auto', minHeight: 52, borderRadius: 2, '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', py: 1.25, fontSize: '0.98rem', lineHeight: 1.35 } }}
                />
                <Chip
                  label={`${results.remainingCount} não selecionados • R$ ${results.remainingTotalBalance.toFixed(2)} • ${remainingBalanceAction === 'saque' ? 'saque' : 'missionário'}`}
                  color="info"
                  sx={{ height: 'auto', minHeight: 52, borderRadius: 2, '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', py: 1.25, fontSize: '0.98rem', lineHeight: 1.35 } }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, fontWeight: 600 }}>
                <AssignmentIcon color="action" />
                Relatórios Gerados
              </Typography>
              <List dense sx={{ py: 0 }}>
                {results.reportsGenerated.map((report, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                    <ListItemText 
                      primary={`✅ ${report}`}
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                Os arquivos foram baixados automaticamente. 
                Todos os saldos e estoques foram zerados no sistema.
              </Typography>
            </Alert>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        {step === 'confirm' && (
          <>
            <Button onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              color="warning"
              onClick={handleConfirmStart}
            >
              Prosseguir com Encerramento
            </Button>
          </>
        )}

        {step === 'balance-choice' && (
          <>
            <Button onClick={() => setStep('confirm')}>
              Voltar
            </Button>
            <Button 
              variant="contained" 
              onClick={handleBalanceChoice}
            >
              Confirmar e Encerrar
            </Button>
          </>
        )}

        {step === 'processing' && (
          <Button disabled>
            Processando...
          </Button>
        )}

        {step === 'completed' && (
          <Button 
            variant="contained" 
            onClick={handleClose}
            color="success"
            sx={{ minWidth: 132, borderRadius: 2 }}
          >
            Finalizar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
