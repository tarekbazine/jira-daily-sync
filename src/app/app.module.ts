import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NgxJsonViewerModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
