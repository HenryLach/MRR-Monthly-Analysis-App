import React, { useState } from 'react';
import Papa from 'papaparse';

const MRRReport = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportTitle, setReportTitle] = useState('MRR Changes Report');

  const processCSV = (file) => {
    setIsLoading(true);
    setError(null);
    
    // Extract date from filename if possible
    let reportPeriod = '';
    const dateRangeMatch = file.name.match(/(\d{8})(\d{8})/);
    if (dateRangeMatch) {
      const startDate = dateRangeMatch[1];
      const startYear = startDate.substring(0, 4);
      const startMonth = parseInt(startDate.substring(4, 6));
      
      const monthNames = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"];
      reportPeriod = `${monthNames[startMonth - 1]} ${startYear}`;
      setReportTitle(`MRR Changes Report - ${reportPeriod}`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target.result;
      
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`Error parsing CSV: ${results.errors[0].message}`);
            setIsLoading(false);
            return;
          }
          
          try {
            // Process the data
            const processedData = processData(results.data, reportPeriod);
            setReportData(processedData);
            setIsLoading(false);
          } catch (err) {
            setError(`Error processing data: ${err.message}`);
            setIsLoading(false);
          }
        },
        error: (err) => {
          setError(`Error parsing CSV: ${err.message}`);
          setIsLoading(false);
        }
      });
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  const processData = (data, reportPeriod) => {
    // Group by company name
    const groupedByCompany = {};
    
    data.forEach(row => {
      const companyName = row['Company Name'];
      const category = row['Type'];
      const mrrChange = row['Total MRR Delta'];
      
      // Skip rows with undefined company name or MRR delta
      if (!companyName || mrrChange === undefined || mrrChange === null) {
        return;
      }
      
      if (!groupedByCompany[companyName]) {
        groupedByCompany[companyName] = {
          totalMrrChange: 0,
          hasNew: false,
          hasChurn: false,
          entries: []
        };
      }
      
      groupedByCompany[companyName].totalMrrChange += mrrChange;
      if (category === 'New') groupedByCompany[companyName].hasNew = true;
      if (category === 'Churn') groupedByCompany[companyName].hasChurn = true;
      
      groupedByCompany[companyName].entries.push({
        category,
        mrrChange
      });
    });

    // Determine final category for each company
    const consolidatedData = [];
    Object.entries(groupedByCompany).forEach(([companyName, data]) => {
      // Skip companies with a net MRR change of 0
      if (Math.abs(data.totalMrrChange) < 0.01) {
        return;
      }
      
      let finalCategory;
      if (data.totalMrrChange > 0) {
        finalCategory = data.hasNew ? 'New' : 'Expansion';
      } else {
        finalCategory = data.hasChurn ? 'Churn' : 'Contraction';
      }
      
      consolidatedData.push({
        companyName,
        mrrChangeValue: data.totalMrrChange,
        category: finalCategory
      });
    });

    // Sort by Category (Z-A), then by MRR Change (largest to smallest), then by Company Name (A-Z)
    consolidatedData.sort((a, b) => {
      // First by category (Z-A)
      if (b.category < a.category) return -1;
      if (b.category > a.category) return 1;
      
      // Then by MRR change (largest to smallest)
      const mrrDiff = b.mrrChangeValue - a.mrrChangeValue;
      if (mrrDiff !== 0) return mrrDiff;
      
      // Finally by company name (A-Z)
      return a.companyName.localeCompare(b.companyName);
    });

    // Calculate category totals
    const categoryTotals = {};
    consolidatedData.forEach(item => {
      if (!categoryTotals[item.category]) {
        categoryTotals[item.category] = 0;
      }
      categoryTotals[item.category] += item.mrrChangeValue;
    });

    const totalNetMrrChange = consolidatedData.reduce(
      (acc, item) => acc + item.mrrChangeValue, 0
    );

    return {
      tableData: consolidatedData,
      categoryTotals,
      totalNetMrrChange,
      reportPeriod
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processCSV(file);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{reportTitle}</h1>
      
      <div className="mb-8">
        <label className="block text-gray-700 mb-2">Upload MRR Report CSV:</label>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {error && (
          <div className="mt-2 text-red-500">{error}</div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-4">Processing data...</div>
      ) : reportData ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            MRR Changes for {reportData.reportPeriod}
          </h2>
          
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Name
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MRR Change
                  </th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.tableData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-200 text-sm">
                      {row.companyName}
                    </td>
                    <td className={`py-2 px-4 border-b border-gray-200 text-sm ${row.mrrChangeValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.mrrChangeValue >= 0 ? '+' : ''}${Math.abs(row.mrrChangeValue).toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200 text-sm">
                      {row.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold mb-2">Summary by Category</h3>
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 text-sm text-gray-600">Category</th>
                  <th className="text-left py-2 text-sm text-gray-600">MRR Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportData.categoryTotals).map(([category, total], index) => (
                  <tr key={index}>
                    <td className="py-1 text-sm">{category}</td>
                    <td className={`py-1 text-sm ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {total >= 0 ? '+' : ''}${Math.abs(total).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200">
                  <td className="py-2 font-semibold text-sm">Total Net MRR Change</td>
                  <td className={`py-2 font-semibold text-sm ${reportData.totalNetMrrChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {reportData.totalNetMrrChange >= 0 ? '+' : ''}${Math.abs(reportData.totalNetMrrChange).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between mt-6">
            <button 
              onClick={() => window.print()} 
              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
            >
              Print Report
            </button>
            
            <button 
              onClick={() => setReportData(null)} 
              className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Upload New File
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          Upload a CSV file to generate the MRR report
        </div>
      )}
    </div>
  );
};

export default MRRReport;
