import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Download
} from 'lucide-react';
import axios from 'axios';

const DailySpending = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bankNames, setBankNames] = useState([]);
  const [filters, setFilters] = useState({
    currency: '',
    category: '',
    bank_name: '',
    start_date: '',
    end_date: ''
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    currency: '',
    category: '',
    description: '',
    bank_name: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pdfCurrency, setPdfCurrency] = useState(''); // New state for PDF currency

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, categoriesRes, bankNamesRes, transactionsRes] = await Promise.all([
        axios.get('/api/daily-spending/summary'),
        axios.get('/api/daily-spending/categories'),
        axios.get('/api/daily-spending/bank-names'),
        axios.get('/api/daily-spending/transactions') // Changed from /recent to /transactions
      ]);

      setSummary(summaryRes.data.data);
      setCategories(categoriesRes.data.data);
      setBankNames(bankNamesRes.data.data);
      
      // Apply the same currency exchange filtering as in applyFilters
      const filteredTransactions = transactionsRes.data.data.transactions.filter(tx => 
        !tx.description.includes('Döviz') && 
        !tx.description.includes('Currency') && 
        !tx.description.includes('Exchange')
      );
      
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('error', 'Failed to fetch data');
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const processTextInput = async () => {
    if (!textInput.trim()) {
      showMessage('error', 'Please enter some text');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/api/daily-spending/process-text', {
        text: textInput
      });

      showMessage('success', `Successfully processed ${response.data.data.total} transactions`);
      setTextInput('');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error processing text:', error);
      showMessage('error', error.response?.data?.message || 'Failed to process text');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showMessage('error', 'Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('error', 'File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post('/api/daily-spending/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      showMessage('success', `Successfully processed PDF with ${response.data.data.total} transactions`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error uploading PDF:', error);
      showMessage('error', error.response?.data?.message || 'Failed to upload PDF');
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const applyFilters = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`/api/daily-spending/transactions?${params}`);
      
      // Apply the same currency exchange filtering as in fetchData
      const filteredTransactions = response.data.data.transactions.filter(tx => 
        !tx.description.includes('Döviz') && 
        !tx.description.includes('Currency') && 
        !tx.description.includes('Exchange')
      );
      
      // Set transactions to ONLY the filtered results
      setTransactions(filteredTransactions);
      
      console.log('Applied filters:', filters);
      console.log('Filtered transactions count:', filteredTransactions.length);
      console.log('Sample filtered transactions:', filteredTransactions.slice(0, 3));
      
    } catch (error) {
      console.error('Error applying filters:', error);
      showMessage('error', 'Failed to apply filters');
    }
  };

  const clearFilters = () => {
    setFilters({
      currency: '',
      category: '',
      bank_name: '',
      start_date: '',
      end_date: ''
    });
    // Now fetchData() uses the same endpoint and filtering as applyFilters()
    fetchData();
  };

  const startEditing = (transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: Math.abs(transaction.amount).toString(),
      currency: transaction.currency,
      category: transaction.category,
      description: transaction.description,
      bank_name: transaction.bank_name
    });
  };

  const cancelEditing = () => {
    setEditingTransaction(null);
    setEditForm({
      amount: '',
      currency: '',
      category: '',
      description: '',
      bank_name: ''
    });
  };

  const saveEdit = async () => {
    try {
      const response = await axios.put(`/api/daily-spending/transactions/${editingTransaction.id}`, {
        amount: -parseFloat(editForm.amount), // Convert to negative for expenses
        currency: editForm.currency,
        category: editForm.category,
        description: editForm.description,
        bank_name: editForm.bank_name
      });

      showMessage('success', 'Transaction updated successfully');
      setEditingTransaction(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating transaction:', error);
      showMessage('error', 'Failed to update transaction');
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await axios.delete(`/api/daily-spending/transactions/${transactionId}`);
      showMessage('success', 'Transaction deleted successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showMessage('error', 'Failed to delete transaction');
    }
  };

  const formatCurrency = (amount, currency) => {
    console.log('formatCurrency called with:', { amount, currency }); // Debug log
    
    const formatters = {
      TRY: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
      SAR: new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' })
    };

    const formatter = formatters[currency] || formatters.TRY;
    const result = formatter.format(amount);
    console.log('formatCurrency result:', result); // Debug log
    return result;
  };

  const getCurrencyColor = (currency) => {
    const colors = {
      TRY: 'text-green-600',
      USD: 'text-blue-600',
      EUR: 'text-purple-600',
      SAR: 'text-orange-600'
    };
    return colors[currency] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
                              <h1 className="text-3xl font-bold text-gray-900">Daily Spending Tracker</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Track your daily expenses and spending patterns with AI-powered categorization
                </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4`}>
          <div className={`rounded-md p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: TrendingUp },
              { id: 'add-expense', name: 'Add Expense', icon: DollarSign },
              { id: 'transactions', name: 'Transactions', icon: FileText },
              { id: 'upload-pdf', name: 'Upload PDF', icon: Upload }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                // Calculate summary from the same transactions data used in filtered totals
                const currencies = [...new Set(transactions.map(tx => tx.currency))];
                return currencies.map(currency => {
                  const currencyTransactions = transactions.filter(tx => tx.currency === currency);
                  const totalExpenses = currencyTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
                  const transactionCount = currencyTransactions.length;
                  
                  return (
                    <div key={currency} className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center`}>
                              <span className={`text-lg font-bold ${getCurrencyColor(currency)}`}>
                                {currency}
                              </span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                {currency} Expenses
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {formatCurrency(totalExpenses, currency)}
                              </dd>
                            </dl>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-sm text-gray-500">
                            {transactionCount} transactions
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Expenses: {formatCurrency(totalExpenses, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Recent Transactions
                </h3>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Currency
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.transaction_date || tx.entry_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tx.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${getCurrencyColor(tx.currency)}`}>
                              {tx.currency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'add-expense' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Expense Entry</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter expenses (format: amount currency - description)
                </label>
                <textarea
                  id="text-input"
                  rows={4}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="200 tl - coffee, 300tl - dinner, 50 usd - lunch"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Example: "200 tl - coffee, 300tl - dinner, 50 usd - lunch"
                </p>
              </div>
              <button
                onClick={processTextInput}
                disabled={isProcessing || !textInput.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  'Process Expenses'
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                All Transactions
              </h3>
              
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <select
                  value={filters.currency}
                  onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Currencies</option>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SAR">SAR</option>
                </select>

                <select
                  value={filters.bank_name}
                  onChange={(e) => setFilters({ ...filters, bank_name: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Banks</option>
                  {bankNames.map((bankName) => (
                    <option key={bankName} value={bankName}>{bankName}</option>
                  ))}
                </select>

                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Start Date"
                />

                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="End Date"
                />

                <div className="flex space-x-2">
                  <button
                    onClick={applyFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                  </button>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter Summary */}
              {(() => {
                const activeFilters = Object.entries(filters).filter(([key, value]) => value && value !== '');
                if (activeFilters.length === 0) return null;
                
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
                      {activeFilters.map(([key, value]) => (
                        <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {key.replace('_', ' ')}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Filtered Results Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-gray-900">
                      {transactions.length}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">Filtered Transactions</div>
                  </div>
                  <div className="text-center col-span-2 md:col-span-1">
                    <div className="text-lg md:text-2xl font-bold text-blue-600 break-words">
                      {/* Use backend summary data for consistency */}
                      {(() => {
                        const totalTRY = summary.find(item => item.currency === 'TRY')?.total_expenses || 0;
                        const totalUSD = summary.find(item => item.currency === 'USD')?.total_expenses || 0;
                        const totalEUR = summary.find(item => item.currency === 'EUR')?.total_expenses || 0;
                        const totalSAR = summary.find(item => item.currency === 'SAR')?.total_expenses || 0;
                        return `${totalTRY.toFixed(2)} ₺ + ${totalUSD.toFixed(2)} $ + ${totalEUR.toFixed(2)} € + ${totalSAR.toFixed(2)} ﷼`;
                      })()}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">Total (All Data)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      {summary.find(item => item.currency === 'TRY')?.total_expenses?.toFixed(2) || '0.00'} ₺
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">TRY Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl md:text-2xl font-bold text-purple-600">
                      {summary.find(item => item.currency === 'USD')?.total_expenses?.toFixed(2) || '0.00'} $
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">USD Total</div>
                  </div>
                </div>
                
                {/* Filtered Data Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center mb-3">
                    <div className="text-sm font-medium text-gray-700">Filtered Data Summary</div>
                    <div className="text-xs text-gray-500">Totals for currently filtered transactions</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-700">
                        {transactions.filter(tx => tx.currency === 'TRY').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)} ₺
                      </div>
                      <div className="text-xs text-gray-500">Filtered TRY</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-700">
                        {transactions.filter(tx => tx.currency === 'USD').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)} $
                      </div>
                      <div className="text-xs text-gray-500">Filtered USD</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-700">
                        {transactions.filter(tx => tx.currency === 'EUR').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)} €
                      </div>
                      <div className="text-xs text-gray-500">Filtered EUR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-700">
                        {transactions.filter(tx => tx.currency === 'SAR').reduce((sum, tx) => sum + Math.abs(tx.amount), 0).toFixed(2)} ﷼
                      </div>
                      <div className="text-xs text-gray-500">Filtered SAR</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  💡 Scroll horizontally to see all columns
                </div>
                <table className="min-w-[1200px] divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-medium text-gray-900 mb-2">No transactions found</div>
                            <div className="text-sm text-gray-500">Try adjusting your filters or add some expenses</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.transaction_date || tx.entry_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tx.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tx.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(Math.abs(tx.amount), tx.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${getCurrencyColor(tx.currency)}`}>
                              {tx.currency}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.bank_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tx.source_type === 'pdf_upload' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {tx.source_type === 'pdf_upload' ? 'PDF' : 'Text'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditing(tx)}
                                className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTransaction(tx.id)}
                                className="text-red-600 hover:text-red-900 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'upload-pdf' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Bank Statement PDF</h3>
            
            {/* Currency Selection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency for PDF Transactions
              </label>
              <div className="flex items-center space-x-4">
                <select
                  value={pdfCurrency}
                  onChange={(e) => setPdfCurrency(e.target.value)}
                  className="block w-48 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Mixed Currencies (AI Detection)</option>
                  <option value="TRY">Turkish Lira (TRY)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="SAR">Saudi Riyal (SAR)</option>
                </select>
                
                {pdfCurrency && (
                  <button
                    onClick={() => setPdfCurrency('')}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    Reset to Mixed
                  </button>
                )}
                
                <div className="text-sm text-gray-600">
                  {pdfCurrency ? 
                    `🔒 All expenses will be treated as ${pdfCurrency}` : 
                    '🤖 AI will detect currencies from PDF content'
                  }
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {pdfCurrency && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-bold">{pdfCurrency}</span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800">
                        Currency Locked to {pdfCurrency}
                      </p>
                      <p className="text-xs text-blue-600">
                        All transactions from this PDF will use {pdfCurrency} currency
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Drop your PDF here, or{' '}
                      <span className="text-blue-600 hover:text-blue-500">browse</span>
                    </span>
                    <p className="mt-1 text-xs text-gray-500">
                      PDF files up to 10MB. Supports all major bank statement formats.
                    </p>
                  </label>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Processing PDF...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Eye className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      What happens when you upload a PDF?
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>AI extracts all transactions automatically</li>
                        <li>Detects bank name and statement period</li>
                        <li>Categorizes each transaction intelligently</li>
                        <li>Separates by currency automatically</li>
                        <li>Records transaction dates if available</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {editingTransaction && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Transaction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input
                      type="text"
                      value={editForm.bank_name}
                      onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={saveEdit}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailySpending;