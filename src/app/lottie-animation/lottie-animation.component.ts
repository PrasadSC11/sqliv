import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, PLATFORM_ID, ViewChild } from '@angular/core';

@Component({
  selector: 'app-lottie-animation',
  standalone: false,
  templateUrl: './lottie-animation.component.html',
  styleUrl: './lottie-animation.component.css'
})
export class LottieAnimationComponent implements AfterViewInit{
  @ViewChild('animationContainer', { static: false }) animationContainer!: ElementRef;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngAfterViewInit() {
    
    // Check if running on the browser, not on the server (in case of SSR)
    if (isPlatformBrowser(this.platformId)) {

      // Dynamically import 'lottie-web' only on the client-side
      const lottie = (await import('lottie-web')).default;

      // Load the Lottie animation
      lottie.loadAnimation({
        container: this.animationContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/annimation.json'
      });
    }
  }
}
