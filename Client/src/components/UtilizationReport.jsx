import { useEffect, useState } from 'react';
import './UtilizationReport.css';

const REPORT_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/reports/monthly-utilization`;

function currentCampusMonth() {
  const { year, month } = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${year}-${month}`;
}

function formatHours(hours) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(hours);
}

function UtilizationReport({ token }) {
  const [month, setMonth] = useState(currentCampusMonth);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadReport() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${REPORT_API}?month=${encodeURIComponent(month)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load the report.');
        setReport(result);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Unable to load the report.');
          setReport(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReport();
    return () => controller.abort();
  }, [month, token]);

  const monthLabel = report
    ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${report.month}-01T00:00:00Z`))
    : '';

  return (
    <section className="utilization-report" aria-label="Monthly resource utilization report">
      <div className="utilization-report-controls">
        <label className="user-form-field">
          Report month
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
          />
        </label>
      </div>

      {error && <p className="user-form-message error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading monthly report...</p>
        : report && <>
          <h2 className="utilization-month-heading">{monthLabel}</h2>
          <div className="utilization-summary">
            <article className="utilization-metric">
              <span>Total bookings</span>
              <strong>{report.totals.bookingCount}</strong>
            </article>
            <article className="utilization-metric">
              <span>Reserved hours</span>
              <strong>{formatHours(report.totals.bookedHours)}</strong>
            </article>
            <article className="utilization-metric">
              <span>Capacity utilization</span>
              <strong>{report.totals.utilizationPercent === null
                ? 'N/A'
                : `${formatHours(report.totals.utilizationPercent)}%`}</strong>
            </article>
          </div>

          {report.resources.length === 0
            ? <p className="account-directory-empty">No resources are configured.</p>
            : <div className="utilization-table-wrap">
              <table className="utilization-table">
                <thead>
                  <tr>
                    <th scope="col">Resource</th>
                    <th scope="col">Category</th>
                    <th scope="col">Bookings</th>
                    <th scope="col">Reserved hours</th>
                    <th scope="col">Capacity hours</th>
                    <th scope="col">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {report.resources.map((resource) => (
                    <tr key={resource.id}>
                      <th scope="row">{resource.name}</th>
                      <td>{resource.category}</td>
                      <td>{resource.bookingCount}</td>
                      <td>{formatHours(resource.bookedHours)}</td>
                      <td>{formatHours(resource.capacityHours)}</td>
                      <td>{resource.utilizationPercent === null
                        ? 'N/A'
                        : `${formatHours(resource.utilizationPercent)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          <p className="utilization-report-note">
            Room capacity uses configured daily booking windows. Equipment capacity assumes 24-hour availability multiplied by its quantity. Reservations overlapping the selected month are counted, and reserved hours are clipped to the month.
          </p>
        </>}
    </section>
  );
}

export default UtilizationReport;
