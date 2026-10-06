
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArea } from '../../context/AreaContext';
import { useSettings } from '../../context/SettingsContext';
import Toast from '../../components/Toast';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';

export default function Customers() {
  const { t } = useSettings();
  const navigate = useNavigate();

  const {
    customers,
    areas,
    sales,
    updateCustomer,
    deleteCustomer
  } = useArea();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [areaFilter, setAreaFilter] = useState('All Areas');
  const [viewMode, setViewMode] = useState('grid');

  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  // Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [editForm, setEditForm] = useState({
    name: '',
    shopName: '',
    address: '',
    phone: '',
    areaId: '',
    creditLimit: '',
    balance: ''
  });

  // Delete Modal State
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // Show Toast
  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  // Open Edit Modal
  const handleOpenEdit = (customer, e) => {
    e.stopPropagation();

    setEditingCustomer(customer);

    setEditForm({
      name: customer.name || '',
      shopName: customer.shopName || '',
      address: customer.address || '',
      phone: customer.phone || '',
      areaId: customer.areaId || '',
      creditLimit: customer.creditLimit || '',
      balance: customer.balance || ''
    });
  };

  // Save Customer
  const handleSaveEdit = (e) => {
    e.preventDefault();

    if (!editingCustomer) return;

    updateCustomer(editingCustomer.id, editForm);

    setEditingCustomer(null);

    showToast(
      `✓ Customer "${editForm.name}" updated successfully!`
    );
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;

    deleteCustomer(deletingCustomer.id);

    showToast(
      `✓ Customer "${deletingCustomer.name}" deleted.`,
      'error'
    );

    setDeletingCustomer(null);
  };

  // Filter Customers
  const filteredCustomers = customers.filter((customer) => {
    const query = searchTerm.toLowerCase();

    const customerSales = sales.filter(
      (sale) =>
        sale.customerId === customer.id ||
        sale.customer === customer.name
    );

    const purchasedProductsStr = customerSales
      .map((sale) => sale.items?.toLowerCase() || '')
      .join(' ');

    const resolvedAreaName = areas.find(a => a.id === customer.areaId)?.name || customer.areaName || '';

    const matchesSearch =
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      resolvedAreaName.toLowerCase().includes(query) ||
      customer.shopName?.toLowerCase().includes(query) ||
      customer.address?.toLowerCase().includes(query) ||
      customer.balance?.toString().includes(query) ||
      purchasedProductsStr.includes(query);

    const matchesStatus =
      statusFilter === 'All Status' ||
      (
        statusFilter === 'Credit Due' &&
        (
          customer.status === 'Due' ||
          customer.statusType === 'due'
        )
      ) ||
      (
        statusFilter === 'Overdue' &&
        (
          customer.status === 'Overdue' ||
          customer.statusType === 'overdue'
        )
      ) ||
      (
        statusFilter === 'Clear' &&
        (
          customer.status === 'Clear' ||
          customer.statusType === 'clear'
        )
      );

    const matchesArea =
      areaFilter === 'All Areas' ||
      customer.areaId === areaFilter ||
      customer.areaName === areaFilter ||
      resolvedAreaName === areaFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesArea
    );
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
      case 'balance-desc':
        return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      case 'balance-asc':
        return (Number(a.balance) || 0) - (Number(b.balance) || 0);
      case 'purchases-desc':
        return (Number(b.purchases) || 0) - (Number(a.purchases) || 0);
      case 'shop-asc':
        return (a.shopName || '').localeCompare(b.shopName || '', undefined, { sensitivity: 'base' });
      default:
        return 0;
    }
  });

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems: paginatedCustomers,
    totalItems,
    startIndex,
    endIndex
  } = usePagination(sortedCustomers, 9);

  return (
    <div>
      {/* Toast */}
      <Toast
        message={toastMsg}
        type={toastType}
        onClose={() => setToastMsg('')}
      />

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div
        className="card-title"
        style={{
          fontSize: '24px',
          marginBottom: '24px'
        }}
      >
        <span>
          {t('customerDirectory')}
        </span>

        <div
          style={{
            display: 'flex',
            gap: '10px'
          }}
        >
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '2px'
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                background:
                  viewMode === 'grid'
                    ? 'var(--accent-terracotta)'
                    : 'transparent',
                color:
                  viewMode === 'grid'
                    ? 'white'
                    : 'var(--text-dark)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ▦ {t('grid', 'Grid')}
            </button>

            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                background:
                  viewMode === 'table'
                    ? 'var(--accent-terracotta)'
                    : 'transparent',
                color:
                  viewMode === 'table'
                    ? 'white'
                    : 'var(--text-dark)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ☰ {t('table', 'Table')}
            </button>
          </div>

          {/* Add Customer */}
          <button
            className="btn-primary"
            onClick={() => navigate('/customers/add')}
          >
            <i>+</i> {t('addNewCustomer', 'Add New Customer')}
          </button>
        </div>
      </div>

      {/* ============================= */}
      {/* SEARCH & FILTER */}
      {/* ============================= */}

      <div
        className="card"
        style={{
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '2fr 1fr 1fr 1fr',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          {/* Search with Clear Button */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-gray)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder={t('searchCustomers')}
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              style={{
                width: '100%',
                paddingLeft: '34px',
                paddingRight: searchTerm ? '32px' : '12px'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-gray)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={areaFilter}
              onChange={(e) =>
                setAreaFilter(e.target.value)
              }
            >
              <option value="All Areas">
                {t('allAreas')}
              </option>

              {areas.map((area) => (
                <option
                  key={area.id}
                  value={area.id}
                >
                  {area.name} ({area.assignedDay})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All Status">
                {t('allStatuses')}
              </option>

              <option value="Overdue">
                {t('statusOverdue')}
              </option>

              <option value="Credit Due">
                {t('statusPending')}
              </option>

              <option value="Clear">
                {t('clearBalances')}
              </option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              style={{
                borderColor: 'var(--accent-terracotta)',
                fontWeight: 600
              }}
            >
              <option value="name-asc">🔤 Name: A → Z</option>
              <option value="name-desc">🔤 Name: Z → A</option>
              <option value="balance-desc">💰 Balance: High → Low</option>
              <option value="balance-asc">💰 Balance: Low → High</option>
              <option value="purchases-desc">🛍️ Purchases: High → Low</option>
              <option value="shop-asc">🏪 Shop Name: A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================= */}
      {/* GRID VIEW */}
      {/* ============================= */}

      {viewMode === 'grid' ? (
        <div
          className="product-grid"
          style={{
            gridTemplateColumns:
              'repeat(auto-fill, minmax(300px, 1fr))'
          }}
        >
          {paginatedCustomers.map((customer) => {
            const totalPurchases =
              customer.purchases ?? 0;

            const balance =
              Number(customer.balance) || 0;

            const paid =
              Math.max(0, totalPurchases - balance);

            const paidPct =
              totalPurchases > 0
                ? Math.min(100, Math.max(0, Math.round(
                    (paid / totalPurchases) * 100
                  )))
                : 100;

            return (
              <div
                key={customer.id}
                className="card"
                onClick={() =>
                  navigate(
                    `/customers/${customer.id}`
                  )
                }
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Customer Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '14px'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="user-avatar-circle"
                      style={{
                        width: '46px',
                        height: '46px',
                        fontSize: '18px'
                      }}
                    >
                      {customer.name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* Name */}
                    <div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--text-dark)'
                        }}
                      >
                        {customer.name}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-gray)'
                        }}
                      >
                        {customer.email ||
                          customer.phone ||
                          'Individual Customer'}
                      </div>
                    </div>

                    {/* Status */}
                    <span
                      className="status-pill"
                      style={{
                        marginLeft: 'auto',
                        background:
                          customer.statusType ===
                          'overdue'
                            ? 'var(--status-out-bg)'
                            : customer.statusType ===
                              'due'
                            ? 'var(--status-credit-bg)'
                            : 'var(--status-paid-bg)',

                        color:
                          customer.statusType ===
                          'overdue'
                            ? 'var(--status-out)'
                            : customer.statusType ===
                              'due'
                            ? 'var(--status-credit)'
                            : 'var(--status-paid)',

                        fontSize: '10px'
                      }}
                    >
                      {customer.status}
                    </span>
                  </div>

                  {/* Customer Details */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: '10px',
                      fontSize: '12px',
                      background:
                        'var(--bg-main)',
                      padding: '12px',
                      borderRadius: '12px',
                      marginBottom: '14px'
                    }}
                  >
                    {/* Area */}
                    <div>
                      <span
                        style={{
                          color:
                            'var(--text-gray)',
                          display: 'block',
                          fontSize: '10px'
                        }}
                      >
                        TERRITORY AREA
                      </span>

                      <strong
                        style={{
                          color:
                            'var(--text-dark)'
                        }}
                      >
                        {areas.find(a => a.id === customer.areaId)?.name || customer.areaName || 'General Territory'}
                      </strong>
                    </div>

                    {/* Phone */}
                    <div>
                      <span
                        style={{
                          color:
                            'var(--text-gray)',
                          display: 'block',
                          fontSize: '10px'
                        }}
                      >
                        PHONE
                      </span>

                      <strong
                        style={{
                          color:
                            'var(--text-dark)'
                        }}
                      >
                        {customer.phone}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Progress */}
                  <div
                    style={{
                      marginBottom: '12px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        fontSize: '12px',
                        marginBottom: '4px'
                      }}
                    >
                      <span
                        style={{
                          color:
                            'var(--text-gray)'
                        }}
                      >
                        Paid:{' '}
                        <strong>
                          ₹
                          {Math.max(
                            0,
                            paid
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </strong>
                      </span>

                      <span
                        style={{
                          color:
                            'var(--accent-terracotta)',
                          fontWeight: 700
                        }}
                      >
                        Pending: ₹
                        {balance.toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    </div>

                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              paidPct
                            )
                          )}%`,
                          background:
                            'var(--accent-emerald)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop:
                      '1px solid var(--border-light)',
                    marginTop: '8px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      color:
                        'var(--text-gray)'
                    }}
                  >
                    Credit Limit: ₹
                    {(
                      customer.creditLimit ||
                      25000
                    ).toLocaleString('en-IN')}
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px'
                    }}
                  >
                    <button
                      onClick={(e) =>
                        handleOpenEdit(
                          customer,
                          e
                        )
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        color:
                          'var(--accent-indigo)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================= */
        /* TABLE VIEW */
        /* ============================= */

        <div className="card">
          <table>
            <thead>
              <tr>
                <th
                  onClick={() => setSortBy(prev => prev === 'name-asc' ? 'name-desc' : 'name-asc')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort A-Z / Z-A"
                >
                  {t('customerName')} {sortBy === 'name-asc' ? '▲' : sortBy === 'name-desc' ? '▼' : '↕'}
                </th>
                <th>{t('area')}</th>
                <th>{t('phone')}</th>
                <th
                  onClick={() => setSortBy(prev => prev === 'purchases-desc' ? 'name-asc' : 'purchases-desc')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort Purchases"
                >
                  {t('myPurchases')} {sortBy === 'purchases-desc' ? '▼' : '↕'}
                </th>
                <th>{t('paidAmount', 'Paid Amount')}</th>
                <th
                  onClick={() => setSortBy(prev => prev === 'balance-desc' ? 'balance-asc' : 'balance-desc')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort Outstanding Balance"
                >
                  {t('outstandingCredit')} {sortBy === 'balance-desc' ? '▼' : sortBy === 'balance-asc' ? '▲' : '↕'}
                </th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCustomers.map(
                (customer) => {
                  const totalPurchases =
                    customer.purchases ?? 0;

                  const balance =
                    Number(
                      customer.balance
                    ) || 0;

                  const paid =
                    Math.max(0, totalPurchases -
                    balance);

                  return (
                    <tr
                      key={customer.id}
                      onClick={() =>
                        navigate(
                          `/customers/${customer.id}`
                        )
                      }
                      style={{
                        cursor: 'pointer'
                      }}
                    >
                      {/* Customer */}
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color:
                              'var(--text-dark)'
                          }}
                        >
                          {customer.name}
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color:
                              'var(--text-gray)'
                          }}
                        >
                          {customer.email ||
                            customer.phone}
                        </div>
                      </td>

                      {/* Area */}
                      <td>
                        <span
                          style={{
                            fontWeight: 600
                          }}
                        >
                          {areas.find(a => a.id === customer.areaId)?.name || customer.areaName || 'General Territory'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td
                        style={{
                          fontSize: '12px'
                        }}
                      >
                        {customer.phone}
                      </td>

                      {/* Purchases */}
                      <td
                        style={{
                          fontWeight: 600
                        }}
                      >
                        ₹
                        {totalPurchases.toLocaleString(
                          'en-IN'
                        )}
                      </td>

                      {/* Paid */}
                      <td
                        style={{
                          color:
                            'var(--accent-emerald)',
                          fontWeight: 600
                        }}
                      >
                        ₹
                        {Math.max(
                          0,
                          paid
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </td>

                      {/* Balance */}
                      <td
                        style={{
                          color:
                            'var(--accent-terracotta)',
                          fontWeight: 700
                        }}
                      >
                        ₹
                        {balance.toLocaleString(
                          'en-IN'
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            background:
                              customer.statusType ===
                              'overdue'
                                ? 'var(--status-out-bg)'
                                : customer.statusType ===
                                  'due'
                                ? 'var(--status-credit-bg)'
                                : 'var(--status-paid-bg)',

                            color:
                              customer.statusType ===
                              'overdue'
                                ? 'var(--status-out)'
                                : customer.statusType ===
                                  'due'
                                ? 'var(--status-credit)'
                                : 'var(--status-paid)'
                          }}
                        >
                          {customer.status}
                        </span>
                      </td>

                      {/* Edit */}
                      <td>
                        <button
                          onClick={(e) =>
                            handleOpenEdit(
                              customer,
                              e
                            )
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color:
                              'var(--accent-indigo)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

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
        pageSizeOptions={[6, 9, 15, 30]}
      />

      {/* ============================= */}
      {/* EDIT CUSTOMER MODAL */}
      {/* ============================= */}

      {editingCustomer && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '450px',
              padding: '24px'
            }}
          >
            {/* Modal Header */}
            <div className="card-title">
              <span>
                Edit Customer Details
              </span>

              <button
                onClick={() =>
                  setEditingCustomer(null)
                }
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSaveEdit}
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: '14px'
              }}
            >
              {/* Customer Name */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-gray)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Customer Full Name
                </label>

                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      name: e.target.value
                    })
                  }
                />
              </div>

              {/* Address / Shop */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-gray)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Customer Address & Details
                </label>

                <input
                  type="text"
                  value={
                    editForm.address ||
                    editForm.shopName
                  }
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address:
                        e.target.value,
                      shopName:
                        e.target.value
                    })
                  }
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-gray)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Phone Number
                </label>

                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      phone: e.target.value
                    })
                  }
                />
              </div>

              {/* Area */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    color:
                      'var(--text-gray)',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Territory Area
                </label>

                <select
                  value={editForm.areaId}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      areaId:
                        e.target.value
                    })
                  }
                >
                  {areas.map((area) => (
                    <option
                      key={area.id}
                      value={area.id}
                    >
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credit & Balance */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: '12px'
                }}
              >
                {/* Credit Limit */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      color:
                        'var(--text-gray)',
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    Credit Limit (₹)
                  </label>

                  <input
                    type="number"
                    value={
                      editForm.creditLimit
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        creditLimit:
                          Number(
                            e.target.value
                          )
                      })
                    }
                  />
                </div>

                {/* Balance */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      color:
                        'var(--text-gray)',
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    Khata Balance (₹)
                  </label>

                  <input
                    type="number"
                    value={
                      editForm.balance
                    }
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        balance:
                          Number(
                            e.target.value
                          )
                      })
                    }
                  />
                </div>
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '10px'
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    flex: 1
                  }}
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setEditingCustomer(null)
                  }
                  style={{
                    padding:
                      '10px 16px',
                    background:
                      'var(--bg-main)',
                    border:
                      '1px solid var(--border-light)',
                    borderRadius:
                      '10px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

