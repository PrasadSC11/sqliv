import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppComponent } from '../app.component';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { AnimationOptions } from 'ngx-lottie';
import lottie from 'lottie-web';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.css'],
  standalone: false
})
export class ScannerComponent {
  targetUrl: string = '';
  scanResults: any = null;
  isLoading: boolean = false;
  scanStatus: string = '';
  invalid: boolean = false;
  safeUrls: any[] = [];
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  vulnerabilityChartData: any[] = [];
  colorScheme: any;
  animationData: any;
  @ViewChild('animationContainer', { static: false }) animationContainer!: ElementRef;

  options: AnimationOptions = {
    path: 'assets/annimation.json',
  };

  constructor(private http: HttpClient, private app: AppComponent) { }

  loadAnimation() {
    lottie.loadAnimation({
      container: this.animationContainer.nativeElement,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'assets/annimation.json'
    });
  }

  onSubmit(event: Event) {
    this.scanStatus = 'Scanning started...';
    this.invalid = false;
    this.scanResults = null;
    this.currentPage = 1;
    event.preventDefault();

    if (this.targetUrl) {
      this.isLoading = true;
      this.scanStatus = 'Scanning is in process...';

      const apiUrl = `${this.app.baseUrl}`;
      const params = new HttpParams().set('url', this.targetUrl);

      this.http.get(apiUrl, { params }).subscribe({
        next: (data) => {
          console.log(data);
          if (!data) {
            this.invalid = true;
            this.scanStatus = 'Scan failed!.. Invalid URL or Request handled by host server';
            this.isLoading = false;
            return;
          }
          const invalidResults = (data as Record<string, any>)?.['Educational Content'];
          console.log(invalidResults);

          if (invalidResults === null) {
            this.scanStatus = "Entered URL contains educational material and may have keywared of SQLIV "
            this.isLoading = false;
            return
          }
          const failed = (data as Record<string, any>)?.['failed'];
          console.log(failed);
          if (failed === "Null String") {
            this.scanStatus = "Request blocked by host server"
            this.isLoading = false;
            return
          }
          const crawlingFailed = (data as Record<string, any>)?.['crawlingFailed'];
          console.log(crawlingFailed);
          if (crawlingFailed === "Null String") {
            this.scanStatus = "Unable to extract urls"
            this.isLoading = false;
            return
          } const handeled = (data as Record<string, any>)?.['handeled'];
          console.log(handeled);
          if (handeled === "Null String") {
            this.scanStatus = "Injection handeled by server"
            this.isLoading = false;
            return
          }
          this.scanResults = {
            InvalidWebsites: this.prepareInvalidResults(data),
            ...data
          };
          console.log(this.scanResults);

          this.prepareValidResults(data);
          this.updateChartData();
          this.totalPages = Math.ceil(this.scanResults.InvalidWebsites.length / this.pageSize);
          this.scanStatus = 'Scan completed!';
          this.isLoading = false;
        }
      });
    } else {
      alert('Please enter a valid URL.');
    }
  }

  prepareInvalidResults(data: any) {
    const invalidResults = data?.['Invalid Websites'] || [];
    console.log(invalidResults);
    
    const educationalResults = data?.['Educational Websites'] || [];
    const educationalResultsCount = data?.['Educational URLs Found'] || [];
    return [
      ...invalidResults.map((invalid: any) => ({
        URL: invalid.URL,
        Type: invalid.Type,
        Remarks: invalid.Remarks
      })),
      ...educationalResults.map((edu: any) => ({
        URL: edu,
        Type: 'Educational Website',
        Remarks: 'Educational Websites that may have sql injection'
      })),

    ];
  }

  prepareValidResults(data: any) {
    this.safeUrls = (data?.['Valid Websites'] || []);
    console.log(this.safeUrls);

  }

  updateChartData() {
    const totalUrls = this.scanResults?.['Total Crawled URLs (Database A)'] || 1;
    const vulnerableUrls = this.scanResults?.InvalidWebsites.length || 0;
    const educationalUrls = this.scanResults?.['Educational Websites']?.length || 0;
    const safeUrls = totalUrls - (vulnerableUrls + educationalUrls);
    console.log(educationalUrls);
    console.log(vulnerableUrls);

    if (educationalUrls != 0) {
      console.log("in if");
      this.vulnerabilityChartData = [
        { name: 'Educational Websites', value: educationalUrls },
        { name: 'Safe URLs', value: safeUrls }
      ];
    }
    else {
      console.log("in else");

      this.vulnerabilityChartData = [
        { name: 'Vulnerable URLs', value: vulnerableUrls },
        { name: 'Safe URLs', value: safeUrls }
      ];
    }
    this.colorScheme = {
      domain: ['#dc3545', '#28a745']
    };
  }
  exportToExcel1() {
    if (!this.scanResults) {
      alert("No scan results available to export!");
      return;
    }

    // ✅ Step 1: Prepare Summary Data
    const summaryData = [
      { Metric: "Total Crawled URLs", Count: this.scanResults['Total Crawled URLs (Database A)'] || 0 },
      { Metric: "Total Filtered URLs", Count: this.scanResults['Total Filtered URLs (Database B)'] || 0 },
      { Metric: "Injection Handeled By host", Count: this.scanResults['Injection handeled by host'] || 0 },
      { Metric: "Error-based SQLIA", Count: this.scanResults['Error-based attack detected (D)'] || 0 },
      { Metric: "Valid/Invalid SQLIA", Count: this.scanResults['Valid/Invalid SQLIA detected (E)'] || 0 },
      { Metric: "Tautology attack SQLIA", Count: this.scanResults['Tautology attack detected (G)'] || 0 },
      { Metric: "Educational Websites that can be Vulnerable", Count: this.scanResults['Educational URLs Found'] || 0 }
    ];

    // ✅ Step 2: Prepare Vulnerable URLs Data
    const vulnerableUrls = (this.scanResults?.InvalidWebsites || []).map((entry: any, index: number) => ({
      Sr_No: index + 1,
      URL: entry.URL,
      Type: entry.Type,
      Remarks: entry.Remarks
    }));

    // ✅ Step 3: Create Excel Workbook & Sheets
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create detailed vulnerabilities sheet
    if (vulnerableUrls.length > 0) {
      const vulnerabilitiesSheet = XLSX.utils.json_to_sheet(vulnerableUrls);
      XLSX.utils.book_append_sheet(workbook, vulnerabilitiesSheet, 'Vulnerable URLs');
    }

    // ✅ Step 4: Convert to Excel & Download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(data, 'SQLIV_Scan_Report.xlsx');
  }

  exportToExcel() {
    if (!this.safeUrls || this.safeUrls.length === 0) {
      alert("No safe URLs to export!");
      return;
    }
    const formattedData = this.safeUrls.map((url, index) => ({
      Sr_No: index + 1,
      URL: url
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SafeURLs');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    saveAs(data, 'SafeURLs.xlsx');
  }

  getCurrentPageData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    
    // Ensure slice() result is stored
    const currentPageData = this.scanResults?.InvalidWebsites.slice(startIndex, endIndex);
    
    // Print to console
    console.log("Current Page Data:", currentPageData);
    
    // Return the paginated data
    return currentPageData;
}


  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
