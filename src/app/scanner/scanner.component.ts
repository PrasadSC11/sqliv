import { Component, ElementRef, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AppComponent } from '../app.component';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ChartData } from 'chart.js';
import lottie from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';
@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.css']
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
  animationData: any; @ViewChild('animationContainer', { static: false }) animationContainer!: ElementRef;
  options: AnimationOptions = {
    path: 'assets/annimation.json', // download the JSON version of animation in your project directory and add the path to it like ./assets/animations/example.json
  };

  loadAnimation() {
    lottie.loadAnimation({
      container: this.animationContainer.nativeElement,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'assets/annimation.json'
    });
    console.log('loaded');

  }
  constructor(private http: HttpClient, private app: AppComponent) { }

  // loadAnimation() {
  //   const animation = lottie.loadAnimation({
  //     container: this.animationContainer.nativeElement, // The DOM element to contain the animation
  //     renderer: 'svg', // Use 'svg', 'canvas', or 'html' depending on the format of your animation
  //     loop: true,
  //     autoplay: true,
  //     path: 'assets/binoculars.gif' // Path to your animation JSON file
  //   });
  // }
  updateChartData() {
    const totalUrls = this.scanResults?.['Total Crawled URLs (Database A)'] || 1;
    const vulnerableUrls = this.scanResults?.InvalidWebsites.length || 0;
    const safeUrls = totalUrls - vulnerableUrls;

    // Update chart values
    this.vulnerabilityChartData = [
      { name: 'Vulnerable URLs', value: vulnerableUrls },
      { name: 'Safe URLs', value: safeUrls }
    ];
    this.colorScheme = {
      domain: ['#dc3545', '#28a745'] // Green for Safe URLs, Red for Vulnerable URLs
    };
  }
  onSubmit(event: Event) {
    this.scanStatus = 'Scanning started...';
    this.invalid = false;
    this.scanResults = null;
    event.preventDefault(); // Prevents default form submission
    this.loadAnimation();
    if (this.targetUrl) {
      this.isLoading = true;
      this.scanStatus = 'Scanning is in process...';

      const apiUrl = `${this.app.baseUrl}`; // Ensure API URL is correct
      const params = new HttpParams().set('url', this.targetUrl);

      // Send GET request
      this.http.get(apiUrl, { params }).subscribe({
        next: (data) => {
          if (!data) {
            this.invalid = true;
            this.scanStatus = ''; // Reset status
            this.isLoading = false;
            return;
          }

          this.scanResults = {
            InvalidWebsites: this.prepareInvalidResults(data),
            ...data // Merging with the existing results
          };
          this.prepareValidResults(data);
          this.updateChartData();
          this.totalPages = Math.ceil(this.scanResults.InvalidWebsites.length / this.pageSize);
          this.scanStatus = 'Scan completed!'; // Final status
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

  // Prepare invalid results for the result
  prepareInvalidResults(data: any) {
    const invalidResults = data?.['Invalid Websites'] || [];
    return invalidResults.map((invalid: any) => ({
      URL: invalid.URL,
      Type: invalid.Type,
      Remarks: invalid.Remarks
    }));
  }
  prepareValidResults(data: any) {
    this.safeUrls = (data?.['Valid Websites'] || []);
  }
  exportToExcel() {
    if (!this.safeUrls || this.safeUrls.length === 0) {
      alert("No safe URLs to export!");
      return;
    }

    // Format data to have Index and URL only
    const formattedData = this.safeUrls.map((url, index) => ({
      Sr_No: index + 1,
      URL: url  // If `this.safeUrls` contains objects, use `url.URL`
    }));

    // Create a new worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SafeURLs');

    // Write the workbook to an Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Save the file using file-saver
    saveAs(data, 'SafeURLs.xlsx');
  }


  // Get data for the current page
  getCurrentPageData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.scanResults?.InvalidWebsites.slice(startIndex, endIndex);
  }

  // Move to the previous page
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Move to the next page
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
