import axios from 'axios';

const base = 'http://localhost:4000';

// ---------------- TRANSACTIONS ----------------
export const fetchTxns = async () => {
  try {
    console.log('🔍 Fetching transactions...');
    const response = await axios.get(`${base}/transactions`);
    console.log('✅ Transactions fetched successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};

export const addTxn = async (data) => {
  try {
    console.log('📝 Adding transaction:', data);
    const response = await axios.post(`${base}/transactions`, data);
    console.log('✅ Transaction added successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    throw error;
  }
};

export const updateTxn = async (id, data) => {
  try {
    console.log('📝 Updating transaction:', id, data);
    const response = await axios.put(`${base}/transactions/${id}`, data);
    console.log('✅ Transaction updated successfully:', response.data);
    return response;
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    throw error;
  }
};

export const deleteTxn = async (id) => {
  try {
    console.log('🗑️ Deleting transaction:', id);
    const response = await axios.delete(`${base}/transactions/${id}`);
    console.log('✅ Transaction deleted successfully');
    return response;
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    throw error;
  }
};

// ---------------- STOCKS ----------------

export const fetchStocks = () => axios.get(`${base}/stocks`);
export const addStock = (data) => axios.post(`${base}/stocks`, data);
export const updateStock = (symbol, data) => axios.put(`${base}/stocks/${symbol}`, data);
export const deleteStock = (symbol) => axios.delete(`${base}/stocks/${symbol}`);
export const getStockPrices = (symbols) => axios.post(`${base}/stocks/prices`, { symbols });
