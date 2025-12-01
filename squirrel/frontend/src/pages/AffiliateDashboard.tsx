import { useMemo } from 'react';

interface AffiliateStat {
  code: string;
  referrals: number;
  commissionRate: number;
}

export default function AffiliateDashboard() {
  const stats: AffiliateStat[] = useMemo(
    () => [
      { code: 'NAIROBI-DEV', referrals: 24, commissionRate: 0.12 },
      { code: 'LAGOS-LABS', referrals: 18, commissionRate: 0.1 },
    ],
    [],
  );

  return (
    <div className="affiliate-dashboard">
      <header>
        <h1>Affiliate Program</h1>
        <p>Track referrals, commissions, and payout ready balances.</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Referrals</th>
            <th>Commission</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row) => (
            <tr key={row.code}>
              <td>{row.code}</td>
              <td>{row.referrals}</td>
              <td>{(row.commissionRate * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
