import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, TrendingUp, Calendar, DollarSign, Search, X, Edit2, Save, X as Close } from 'lucide-react';
import axios from 'axios';

const Money = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [overview, setOverview] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add'); // 'add', 'transactions', 'analytics'
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filter, setFilter] = useState({ 
    category: '', 
    currency: '', 
    type: '',
    account: '',
    startDate: '', 
    endDate: '',
    search: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchSummary();
    fetchOverview();
    fetchCategories();
    fetchCurrencies();
    fetchAccounts();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.category) params.append('category', filter.category);
      if (filter.currency) params.append('currency', filter.currency);
      if (filter.type) params.append('type', filter.type);
      if (filter.account) params.append('account', filter.account);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      
      const response = await axios.get(`/api/money/transactions?${params}`);
      let filteredTransactions = response.data;
      
      if (filter.search) {
        filteredTransactions = filteredTransactions.filter(transaction => 
          transaction.description?.toLowerCase().includes(filter.search.toLowerCase()) ||
          transaction.category?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }
      
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      
      const response = await axios.get(`/api/money/summary?${params}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchOverview = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      
      const response = await axios.get(`/api/money/overview?${params}`);
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching overview:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/money/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get('/api/money/currencies');
      setCurrencies(response.data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/money/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post('/api/money/add', { text: inputText });
      
      // Add all new transactions to the list
      if (response.data.transactions && response.data.transactions.length > 0) {
        setTransactions([...response.data.transactions, ...transactions]);
      }
      
      setInputText('');
      fetchSummary();
      fetchOverview();
      fetchCurrencies();
      fetchAccounts();
      
      // Show success message
      if (response.data.transactions.length > 1) {
        alert(`Successfully added ${response.data.transactions.length} transactions!`);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      // Show the specific error message from the server
      const errorMessage = error.response?.data?.error || error.message || 'Error adding transaction';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await axios.delete(`/api/money/transactions/${id}`);
      setTransactions(transactions.filter(t => t.id !== id));
      fetchSummary();
      fetchOverview();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      account: transaction.account,
      date: transaction.date
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await axios.put(`/api/money/transactions/${editingId}`, editForm);
      setTransactions(transactions.map(t => 
        t.id === editingId ? response.data.transaction : t
      ));
      setEditingId(null);
      setEditForm({});
      fetchSummary();
      fetchOverview();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const clearFilters = () => {
    setFilter({ category: '', currency: '', type: '', account: '', startDate: '', endDate: '', search: '' });
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', TRY: '₺' };
    return symbols[currency] || currency;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Money Organizer</h1>
        <div className="flex items-center space-x-4">
          {overview.map((currency) => (
            <div key={currency.currency} className="text-right">
              <div className="text-sm text-gray-600">Net {currency.currency}</div>
              <div className={`text-lg font-semibold ${
                parseFloat(currency.netAmount) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {parseFloat(currency.netAmount) >= 0 ? '+' : ''}{getCurrencySymbol(currency.currency)}{parseFloat(currency.netAmount).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-5 h-5 mx-auto mb-1" />
            Add Transaction
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-5 h-5 mx-auto mb-1" />
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5 mx-auto mb-1" />
            Analytics
          </button>
        </div>
      </div>

      {/* Add Transaction Tab */}
      {activeTab === 'add' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Transaction</h2>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your expense (AI will categorize it intelligently)
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Examples:&#10;• spent 5$ on coffee&#10;• received 2000$ salary&#10;• spent 25.50 on lunch&#10;• got 1000 from freelance work&#10;• income of 300$ gift account bank account&#10;• 20000 tl came to me as transfer, spent 400 tl in pharmacy&#10;• got 500 euros from freelance work and spent 50 on groceries"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {loading ? 'Processing...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Filter className="w-5 h-5 text-gray-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium">Transactions</div>
                    <div className="text-lg font-bold text-blue-800">{transactions.length}</div>
                  </div>
                  
                  <div className="bg-green-50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-green-600 font-medium">Total Income</div>
                    <div className="text-lg font-bold text-green-800">
                      {(() => {
                        const incomeByCurrency = {};
                        transactions.filter(t => t.type === 'income').forEach(t => {
                          const currency = t.currency || 'USD';
                          if (!incomeByCurrency[currency]) incomeByCurrency[currency] = 0;
                          incomeByCurrency[currency] += parseFloat(t.amount);
                        });
                        return Object.entries(incomeByCurrency).map(([currency, amount]) => 
                          `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
                        ).join(', ') || '$0.00';
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-red-600 font-medium">Total Expenses</div>
                    <div className="text-lg font-bold text-red-800">
                      {(() => {
                        const expenseByCurrency = {};
                        transactions.filter(t => t.type === 'expense').forEach(t => {
                          const currency = t.currency || 'USD';
                          if (!expenseByCurrency[currency]) expenseByCurrency[currency] = 0;
                          expenseByCurrency[currency] += parseFloat(t.amount);
                        });
                        return Object.entries(expenseByCurrency).map(([currency, amount]) => 
                          `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
                        ).join(', ') || '$0.00';
                      })()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-3 py-2 rounded-lg">
                    <div className="text-xs text-gray-600 font-medium">Net Amount</div>
                    <div className={`text-lg font-bold ${
                      (() => {
                        const netByCurrency = {};
                        transactions.forEach(t => {
                          const currency = t.currency || 'USD';
                          if (!netByCurrency[currency]) netByCurrency[currency] = 0;
                          if (t.type === 'income') netByCurrency[currency] += parseFloat(t.amount);
                          else netByCurrency[currency] -= parseFloat(t.amount);
                        });
                        const totalNet = Object.values(netByCurrency).reduce((sum, val) => sum + val, 0);
                        return totalNet >= 0 ? 'text-green-600' : 'text-red-600';
                      })()
                    }`}>
                      {(() => {
                        const netByCurrency = {};
                        transactions.forEach(t => {
                          const currency = t.currency || 'USD';
                          if (!netByCurrency[currency]) netByCurrency[currency] = 0;
                          if (t.type === 'income') netByCurrency[currency] += parseFloat(t.amount);
                          else netByCurrency[currency] -= parseFloat(t.amount);
                        });
                        return Object.entries(netByCurrency).map(([currency, amount]) => 
                          `${amount >= 0 ? '+' : ''}${getCurrencySymbol(currency)}${amount.toFixed(2)}`
                        ).join(', ') || '$0.00';
                      })()}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              
              <select
                value={filter.account}
                onChange={(e) => setFilter({ ...filter, account: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.account} value={account.account}>
                    {account.account} ({account.count})
                  </option>
                ))}
              </select>
              
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.category} value={category.category}>
                    {category.category} ({category.count})
                  </option>
                ))}
              </select>
              
              <select
                value={filter.currency}
                onChange={(e) => setFilter({ ...filter, currency: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Currencies</option>
                {currencies.map((currency) => (
                  <option key={currency.currency} value={currency.currency}>
                    {currency.currency} ({currency.count})
                  </option>
                ))}
              </select>
              
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Transactions ({transactions.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{transaction.description}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {transaction.category}
                      </span>
                      <span>•</span>
                      <span>{new Date(transaction.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</span>
                      {transaction.currency && transaction.currency !== 'USD' && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {transaction.currency}
                          </span>
                        </>
                      )}
                      {transaction.account && transaction.account !== 'main' && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {transaction.account}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{getCurrencySymbol(transaction.currency || 'USD')}{parseFloat(transaction.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleEditTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No transactions found</p>
                  <p className="text-sm">Try adjusting your filters or add a new transaction</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Transaction Modal */}
          {editingId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Transaction</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={editForm.currency}
                      onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="TRY">TRY</option>
                      <option value="JPY">JPY</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map((category) => (
                        <option key={category.category} value={category.category}>
                          {category.category} ({category.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                    <select
                      value={editForm.account}
                      onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {accounts.map((account) => (
                        <option key={account.account} value={account.account}>
                          {account.account} ({account.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <Close className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Financial Overview by Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {overview.map((currency) => (
              <div key={currency.currency} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">{currency.currency}</h3>
                  <span className="text-sm text-gray-500">{currency.totalTransactions} transactions</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Income:</span>
                    <span className="font-semibold text-green-600">
                      {getCurrencySymbol(currency.currency)}{parseFloat(currency.totalIncome).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expenses:</span>
                    <span className="font-semibold text-red-600">
                      {getCurrencySymbol(currency.currency)}{parseFloat(currency.totalExpenses).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Net:</span>
                      <span className={`font-bold text-lg ${
                        parseFloat(currency.netAmount) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(currency.netAmount) >= 0 ? '+' : ''}{getCurrencySymbol(currency.currency)}{parseFloat(currency.netAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Income by Category</h2>
              <div className="space-y-3">
                {summary.filter(item => item.type === 'income').map((item) => (
                  <div key={`${item.category}-${item.type}-${item.currency}`} className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-gray-800">{item.category}</span>
                        <div className="text-xs text-gray-500">{item.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">+{getCurrencySymbol(item.currency)}{parseFloat(item.total).toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{item.count} transactions</div>
                    </div>
                  </div>
                ))}
                {summary.filter(item => item.type === 'income').length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No income data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Expenses by Category</h2>
              <div className="space-y-3">
                {summary.filter(item => item.type === 'expense').map((item) => (
                  <div key={`${item.category}-${item.type}-${item.currency}`} className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-gray-800">{item.category}</span>
                        <div className="text-xs text-gray-500">{item.currency}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">-{getCurrencySymbol(item.currency)}{parseFloat(item.total).toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{item.count} transactions</div>
                    </div>
                  </div>
                ))}
                {summary.filter(item => item.type === 'expense').length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No expense data available
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Currency Breakdown</h2>
            <div className="space-y-3">
              {currencies.map((currency) => (
                <div key={currency.currency} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-800">{currency.currency}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{currency.count} transactions</div>
                  </div>
                </div>
              ))}
              {currencies.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No currency data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Money; 