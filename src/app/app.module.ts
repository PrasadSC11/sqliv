import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ScannerComponent } from './scanner/scanner.component';
import { HttpClient } from '@angular/common/http';
// import { LottieModule } from 'ngx-lottie';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

export function playerFactory() {
  return import('lottie-web');
}

@NgModule({ 
  declarations: [
    AppComponent,
    ScannerComponent
  ],
  imports: [
   
    BrowserModule,
    HttpClientModule,
    FormsModule,
    NgxChartsModule, 
    // LottieModule.forRoot({ player: playerFactory }),
    ReactiveFormsModule,
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
