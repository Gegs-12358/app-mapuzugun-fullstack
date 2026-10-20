import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnitsPage } from './units.page';

describe('UnitsPage', () => {
  let component: UnitsPage;
  let fixture: ComponentFixture<UnitsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UnitsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
