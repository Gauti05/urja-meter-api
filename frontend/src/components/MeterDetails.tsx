import React, { useEffect, useState } from 'react';
import type { MeterLocation, ConsumptionReading } from '../types/meter';
import { meterApi } from '../api/meterApi';

interface Props {
  meterId: string;
}

export const MeterDetails: React.FC<Props> = ({ meterId }) => {
  const [location, setLocation] = useState<MeterLocation | null>(null);
  const [consumption, setConsumption] = useState<ConsumptionReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const [locRes, consRes] = await Promise.all([
          meterApi.getMeterLocation(meterId),
          meterApi.getMeterConsumption(meterId)
        ]);

        if (active) {
          setLocation(locRes.data);
          setConsumption(consRes.data);
        }
      } catch (err: any) {
        if (active) {
          setError('Unable to load meter details.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      active = false;
    };
  }, [meterId]);

  if (loading) {
    return <div className="details-panel">Loading meter details...</div>;
  }

  if (error) {
    return <div className="details-panel error">{error}</div>;
  }

  return (
    <div className="details-panel">
      <h3>Details for Meter: {meterId}</h3>
      
      {location && (
        <div className="location-info">
          <h4>Location</h4>
          <p>Latitude: {location.latitude}</p>
          <p>Longitude: {location.longitude}</p>
        </div>
      )}

      <h4>Consumption</h4>
      {consumption.length === 0 ? (
        <p>No consumption data available.</p>
      ) : (
        <div className="table-container">
          <table className="meter-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>kWh</th>
                <th>kVAh</th>
                <th>Voltage R</th>
              </tr>
            </thead>
            <tbody>
              {consumption.map((reading, i) => (
                <tr key={i}>
                  <td>{reading.timestamp}</td>
                  <td>{reading.kwh}</td>
                  <td>{reading.kvah}</td>
                  <td>{reading.voltR}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
