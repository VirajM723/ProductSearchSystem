import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Product } from '../../services/product.service';

@Component({
  selector: 'app-product-form',
  template: `
    
      {{ editMode ? 'Edit Product' : 'Add New Product' }}
      
        
          Name:
          
        

        
          Description:
          
        

        
          
            Category:
            
              Select Category
              Electronics
              Clothing
              Books
              Home
            
          

          
            Brand:
            
          
        

        
          
            Price:
            
          

          
            Tags (comma-separated):
            
          
        

        
          
            
            In Stock
          
        

        
          
            {{ editMode ? 'Update' : 'Create' }}
          
          
            Cancel
          
        
      
    
  `,
  styles: [`
    .form-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
      flex: 1;
    }
    .form-row {
      display: flex;
      gap: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: normal;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-primary {
      background: #28a745;
      color: white;
    }
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ProductFormComponent implements OnChanges {
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter();
  @Output() cancel = new EventEmitter();

  productForm: FormGroup;
  editMode = false;

  constructor(private fb: FormBuilder) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      brand: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      tagsInput: [''],
      inStock: [true]
    });
  }

  ngOnChanges() {
    if (this.product) {
      this.editMode = true;
      this.productForm.patchValue({
        ...this.product,
        tagsInput: this.product.tags?.join(', ') || ''
      });
    } else {
      this.editMode = false;
      this.productForm.reset({ inStock: true, price: 0 });
    }
  }

  onSubmit() {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const product: Product = {
        ...formValue,
        tags: formValue.tagsInput.split(',').map((t: string) => t.trim()).filter((t: string) => t)
      };
      delete (product as any).tagsInput;

      if (this.editMode && this.product?._id) {
        product._id = this.product._id;
      }

      this.save.emit(product);
      this.productForm.reset({ inStock: true, price: 0 });
    }
  }

  onCancel() {
    this.productForm.reset({ inStock: true, price: 0 });
    this.cancel.emit();
  }
}