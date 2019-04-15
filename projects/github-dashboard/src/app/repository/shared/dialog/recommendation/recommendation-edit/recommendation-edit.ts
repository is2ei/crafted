import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {DataResources, DataSource, Filterer} from '@crafted/data';
import {ButtonToggleOption} from 'dist/components/lib/widget';
import {Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';

import {Recommendation} from '../../../../services/dao/config/recommendation';
import {DataStore} from '../../../../services/dao/data-dao';


export interface RecommendationEditData {
  recommendation: Recommendation;
  dataStore: DataStore;
  dataResourcesMap: Map<string, DataResources>;
}

export interface RecommendationEditResult {
  recommendation: Recommendation;
}

@Component({
  styleUrls: ['recommendation-edit.scss'],
  templateUrl: 'recommendation-edit.html',
  host: {'(keyup.Enter)': 'save()'},
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendationEdit {
  formGroup = new FormGroup({
    message: new FormControl(''),
    type: new FormControl('', Validators.required),
    data: new FormControl('', Validators.required),
    action: new FormControl(null),
    actionType: new FormControl('', Validators.required),
    filtererState: new FormControl(null),
  });

  dataOptions: ButtonToggleOption[] = [];

  typeOptions: ButtonToggleOption[] = [
    {id: 'warning', icon: 'warning', label: 'Warning'},
    {id: 'suggestion', icon: 'label_important', label: 'Suggestion'},
  ];

  actionOptions: ButtonToggleOption[] = [
    {id: 'add-label', label: 'Add Label'},
    {id: 'add-assignee', label: 'Add Assignee'},
    {id: 'none', label: 'None'},
  ];

  addLabelsOptions = this.data.dataStore.labels.list.pipe(map(labels => {
    const labelNames = labels.map(l => l.name);
    labelNames.sort();
    return labelNames.map(name => ({id: name, label: name}));
  }));

  addAssigneesOptions = this.data.dataStore.items.list.pipe(map(items => {
    const assigneesSet = new Set<string>();
    items.forEach(i => i.assignees.forEach(a => assigneesSet.add(a)));
    const assigneesList: string[] = [];
    assigneesSet.forEach(a => assigneesList.push(a));
    return assigneesList.sort().map(a => ({id: a, label: a}));
  }));

  filterer: Filterer;

  dataSource: DataSource;

  private destroyed = new Subject();

  constructor(
      public dialogRef: MatDialogRef<RecommendationEdit>,
      @Inject(MAT_DIALOG_DATA) public data: RecommendationEditData) {
    if (!data && !data.recommendation) {
      throw Error('Recommendation required to show recommendation dialog');
    }

    this.data.dataResourcesMap.forEach(
        (dataSource, type) => this.dataOptions.push({id: type, label: dataSource.label}));

    const dataForm = this.formGroup.get('data');
    dataForm.valueChanges.subscribe((data: string) => {
      const dataResource = this.data.dataResourcesMap.get(data)!;
      this.filterer = dataResource.filterer();
      this.dataSource = dataResource.dataSource();
    });

    if (data.recommendation) {
      this.formGroup.setValue({
        message: data.recommendation.message || '',
        type: data.recommendation.type || 'warning',
        data: data.recommendation.data || this.dataOptions[0].id,
        actionType: data.recommendation.actionType || 'add-label',
        action: data.recommendation.action || null,
        filtererState: data.recommendation.filtererState || null
      });
    }

    this.formGroup.get('actionType')!.valueChanges.pipe(takeUntil(this.destroyed))
        .subscribe(() => this.formGroup.get('action')!.setValue(null));
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  setAddLabelAction(name: string[]) {
    this.formGroup.get('action')!.setValue({labels: name});
  }

  setAddAssigneeAction(name: string[]) {
    this.formGroup.get('action')!.setValue({assignees: name});
  }


  save() {
    if (this.formGroup.valid) {
      const formValue = this.formGroup.value;
      const recommendation: Recommendation = {
        ...this.data.recommendation,
        message: formValue.message,
        type: formValue.type,
        data: formValue.data,
        actionType: formValue.actionType,
        action: formValue.action,
        filtererState: formValue.filtererState,
      };
      this.dialogRef.close(recommendation);
    }
  }
}