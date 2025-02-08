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
  pageSize: number = 15;
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
            this.scanStatus = '';
            this.isLoading = false;
            return;
          }

          this.scanResults = {
            InvalidWebsites: this.prepareInvalidResults(data),
            ...data
          };

          this.prepareValidResults(data);
          this.updateChartData();
          this.totalPages = Math.ceil(this.scanResults.InvalidWebsites.length / this.pageSize);
          this.scanStatus = 'Scan completed!';
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error during scan:', err);
          alert('Failed to scan the URL. Please try again.');
          this.scanStatus = 'Scan failed!';
          this.isLoading = false;
        }
      });
    } else {
      alert('Please enter a valid URL.');
    }
  }

  prepareInvalidResults(data: any) {
    const invalidResults = data?.['Invalid Websites'] || [];
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
        Remarks: 'Educational Websites may have sql injection'
      }))
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
    return this.scanResults?.InvalidWebsites.slice(startIndex, endIndex);
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
