import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Meter, Pagination } from './types/meter';
import { meterApi } from './api/meterApi';
import { MeterTable } from './components/MeterTable';
import { MeterDetails } from './components/MeterDetails';
import './index.css';

function App() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, pageSize: 20 });
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState<string | undefined>();

  useEffect(() => {
    fetchMeters(query, pagination.page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pagination.page]);

  const fetchMeters = async (searchQuery: string, page: number) => {
    setLoading(true);
    setError('');
    try {
      const response = await meterApi.searchMeters(searchQuery, page);
      setMeters(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Unable to load meters.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPagination((prev: Pagination) => ({ ...prev, page: 1 }));
    setQuery(searchInput);
    setSelectedMeterId(undefined);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination((prev: Pagination) => ({ ...prev, page: prev.page - 1 }));
      setSelectedMeterId(undefined);
    }
  };

  const handleNextPage = () => {
    const maxPages = Math.ceil(pagination.total / pagination.pageSize);
    if (pagination.page < maxPages) {
      setPagination((prev: Pagination) => ({ ...prev, page: prev.page + 1 }));
      setSelectedMeterId(undefined);
    }
  };

  const hasNextPage = pagination.page < Math.ceil(pagination.total / pagination.pageSize);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Urja Meter Explorer</h1>
        <p>Explore meter information through the clean Urja Meter API.</p>
      </header>

      <main className="app-main">
        <section className="search-section">
          <h2>Search meters</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input 
              type="text" 
              placeholder="Search by meter ID or serial number..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">Search</button>
          </form>
        </section>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-message">Loading meters...</div>
        ) : (
          <>
            <MeterTable 
              meters={meters} 
              onSelectMeter={(m) => setSelectedMeterId(m.meterId)} 
              selectedMeterId={selectedMeterId}
            />

            <div className="pagination">
              <button 
                onClick={handlePrevPage} 
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page}
              </span>
              <button 
                onClick={handleNextPage} 
                disabled={!hasNextPage}
              >
                Next
              </button>
            </div>
          </>
        )}

        {selectedMeterId && (
          <MeterDetails meterId={selectedMeterId} />
        )}
      </main>
    </div>
  );
}

export default App;
