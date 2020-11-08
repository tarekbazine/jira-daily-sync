import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import { UrlPipe } from './pipes/url.pipe';
import { HumanDurationPipe } from './pipes/human-duration.pipe';
import { GetStatusPipe } from './pipes/specific/get-status.pipe';

@NgModule({
  declarations: [AppComponent, UrlPipe, HumanDurationPipe, GetStatusPipe],
  imports: [
    BrowserModule,
    NgxJsonViewerModule,
    BrowserAnimationsModule,

    // mat
    MatExpansionModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatButtonModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
