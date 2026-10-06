import React, { useState } from 'react';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Reports() {
  const { areas, customers, sales, collections, products } = useArea();
  const { t } = useSettings();
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
  };

  const downloadCSV = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Downloaded ${filename} successfully!`);
  };

  // Export 1: Weekly Area Performance Report CSV
  const handleExportAreaReport = () => {
    let csv = 'Area Code,Area Name,Assigned Day,Mapped Customers,Target Collection,Collected Amount,Territory Outstanding\n';
    areas.forEach(a => {
      const areaCusts = customers.filter(c => c.areaId === a.id || c.areaName === a.name);
      const areaBalance = areaCusts.reduce((sum, c) => sum + (c.balance || 0), 0);
      csv += `"${a.code}","${a.name}","${a.assignedDay}",${areaCusts.length},${a.targetCollection},${a.collectedSoFar},${areaBalance}\n`;
    });
    downloadCSV('Weekly_Area_Performance_Report.csv', csv);
  };

  // Export 2: Khata Defaulters Report CSV
  const handleExportKhataDefaulters = () => {
    let csv = 'Customer Name,Email,Phone,Territory Area,Pending Balance,Credit Limit,Status\n';
    customers.filter(c => c.balance > 0).forEach(c => {
      csv += `"${c.name}","${c.email || ''}","${c.phone}","${c.areaName}",${c.balance},${c.creditLimit},"${c.status}"\n`;
    });
    downloadCSV('Khata_Defaulters_Report.csv', csv);
  };

  // Export 3: Inventory Stock Valuation Report CSV
  const handleExportInventoryValuation = () => {
    let csv = 'SKU Code,Item Name,Category,Main Godown Stock,Annex Godown Stock,Total Stock,Unit Price,Total Stock Value\n';
    products.forEach(p => {
      const val = p.price * p.stock;
      csv += `"${p.sku}","${p.name}","${p.category}",${p.godown1 || p.stock},${p.godown2 || 0},${p.stock},${p.price},${val}\n`;
    });
    downloadCSV('Inventory_Valuation_Report.csv', csv);
  };

  // Export 4: PDF Print Report
  const handlePrintPDF = (reportTitle) => {
    showToast(`✓ Preparing ${reportTitle} for Print / PDF Export...`);
    window.print();
  };

  const totalWeeklyTarget = areas.reduce((sum, a) => sum + a.targetCollection, 0);
  const totalWeeklyCollected = areas.reduce((sum, a) => sum + a.collectedSoFar, 0);
  const totalWeeklyOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedAreas,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(areas, 5);

  return (
    <div style={{ paddingTop: '10px' }}>
      <Toast message={toastMsg} onClose={() => setToastMsg('')} />

      <div className="card-title" style={{ fontSize: '24px', marginBottom: '24px', color: 'var(--text-dark)' }}>
        {t('businessReportsTitle', 'Business Reports & Export Center')}
      </div>

      {/* Report Export Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '22px', textAlign: 'center' }}>
          <div className="kpi-icon" style={{ background: 'var(--icon-purple-bg)', color: 'var(--accent-maroon)', margin: '0 auto 14px' }}>📊</div>
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-dark)' }}>{t('salesInvoicesReport', 'Sales & Invoices Report')}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '16px' }}>{t('salesReportDesc', 'Sales transactions & invoice summary.')}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                let csv = 'Invoice No,Customer,Area,Date,Items,Total Amount,Payment Type,Status\n';
                sales.forEach(s => {
                  csv += `"${s.id}","${s.customer}","${s.areaName}","${s.date}","${s.items}",${s.totalAmount},"${s.paymentType}","${s.status}"\n`;
                });
                downloadCSV('Sales_Invoices_Report.csv', csv);
              }}
              style={{ border: 'none', background: 'var(--accent-maroon)', color: '#FAF6F0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('exportCsv', 'Export CSV')}
            </button>
            <button
              onClick={() => handlePrintPDF('Sales Report')}
              style={{ border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('printPdf', 'Print / PDF')}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '22px', textAlign: 'center' }}>
          <div className="kpi-icon" style={{ background: 'var(--icon-gold-bg)', color: 'var(--accent-gold-dark)', margin: '0 auto 14px' }}>📍</div>
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-dark)' }}>{t('areaPerformanceReport', 'Area Route Performance')}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '16px' }}>{t('areaPerformanceDesc', 'Weekly territory collection report.')}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleExportAreaReport}
              style={{ border: 'none', background: 'var(--accent-maroon)', color: '#FAF6F0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('exportCsv', 'Export CSV')}
            </button>
            <button
              onClick={() => handlePrintPDF('Area Performance Report')}
              style={{ border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('printPdf', 'Print / PDF')}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '22px', textAlign: 'center' }}>
          <div className="kpi-icon" style={{ background: 'var(--icon-orange-bg)', color: 'var(--accent-warning)', margin: '0 auto 14px' }}>📒</div>
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-dark)' }}>{t('khataDefaultersReport', 'Khata Credit Ledger')}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '16px' }}>{t('khataDefaultersDesc', 'Customers with pending credit balance.')}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleExportKhataDefaulters}
              style={{ border: 'none', background: 'var(--accent-maroon)', color: '#FAF6F0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('exportCsv', 'Export Excel')}
            </button>
            <button
              onClick={() => handlePrintPDF('Khata Credit Report')}
              style={{ border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('printPdf', 'Print / PDF')}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '22px', textAlign: 'center' }}>
          <div className="kpi-icon" style={{ background: 'var(--icon-teal-bg)', color: 'var(--accent-forest)', margin: '0 auto 14px' }}>📦</div>
          <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-dark)' }}>{t('inventoryValuationReport', 'Inventory Stock Valuation')}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-gray)', marginBottom: '16px' }}>{t('inventoryValuationDesc', 'Current warehouse stock valuation.')}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleExportInventoryValuation}
              style={{ border: 'none', background: 'var(--accent-maroon)', color: '#FAF6F0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('exportCsv', 'Export Excel')}
            </button>
            <button
              onClick={() => handlePrintPDF('Inventory Valuation Report')}
              style={{ border: '1px solid var(--border-gold-subtle)', background: 'var(--bg-main)', color: 'var(--text-dark)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600 }}
            >
              {t('printPdf', 'Print / PDF')}
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Area Sales & Collection Performance Report Table */}
      <div className="card">
        <div className="card-title">
          {t('areaPerformanceReport', 'Weekly Area-Wise Sales & Installment Collection Performance')}
          <button
            onClick={handleExportAreaReport}
            className="btn-generate"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}
          >
            📊 {t('exportCsv', 'Export CSV / Excel Summary')}
          </button>
        </div>

        {/* Summary metrics header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px', background: 'var(--bg-main)', padding: '16px', borderRadius: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('dailyTargetSummary', 'Total Weekly Collection Target')}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-dark)' }}>₹ {totalWeeklyTarget.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('collectedToday', 'Collected So Far')}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--icon-green)' }}>₹ {totalWeeklyCollected.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-gray)', fontWeight: 500 }}>{t('totalAreaBalance', 'Total Territory Balance')}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--icon-red)' }}>₹ {totalWeeklyOutstanding.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>{t('scheduledDay', 'Assigned Day')}</th>
              <th>{t('areaName', 'Area Code & Name')}</th>
              <th>{t('mappedCustomers', 'Customers Mapped')}</th>
              <th>{t('target', 'Target Amount')}</th>
              <th>{t('collected', 'Collected Amount')}</th>
              <th>{t('totalAreaBalance', 'Territory Balance')}</th>
              <th>{t('progress', 'Collection Efficiency')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAreas.map((a) => {
              const areaCusts = customers.filter(c => c.areaId === a.id || c.areaName === a.name);
              const mappedCount = areaCusts.length;
              const areaOutstanding = areaCusts.reduce((sum, c) => sum + (c.balance || 0), 0);
              const efficiency = a.targetCollection > 0 ? Math.min(100, Math.round((a.collectedSoFar / a.targetCollection) * 100)) : 0;
              return (
                <tr key={a.id}>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(a.assignedDay) ? 'var(--terracotta-light)' : 'var(--bg-main)',
                        color: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(a.assignedDay) ? 'var(--terracotta)' : 'var(--text-gray)'
                      }}
                    >
                      {t(a.assignedDay.toLowerCase(), a.assignedDay)}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{a.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-gray)' }}>{a.code}</div>
                  </td>
                  <td>{mappedCount} {t('customers', 'Customers')}</td>
                  <td style={{ fontWeight: 600 }}>₹ {a.targetCollection.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--icon-green)', fontWeight: 700 }}>₹ {a.collectedSoFar.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--icon-red)', fontWeight: 600 }}>₹ {areaOutstanding.toLocaleString('en-IN')}</td>
                  <td style={{ width: '150px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                      <span>{efficiency}%</span>
                    </div>
                    <div style={{ height: '6px', width: '100%', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${efficiency}%`, background: efficiency > 50 ? 'var(--icon-green)' : 'var(--icon-orange)' }}></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
}
