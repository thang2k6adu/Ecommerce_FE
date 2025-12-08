import { toast } from "react-hot-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";

import { FormLayout } from "@/forms/FormLayout/FormLayout";
import ProductDetailsSection from "./components/ProductDetailsSection";
import { ImageUploadSection } from "./components/ImageUploadSection";
import PricingSection from "./components/PricingSection";
import StatusSection from "./components/StatusSection";
import CategoriesSection from "./components/CategoriesSection";
import { VariantsSection } from "./components/VariantsSection";

import { productSchema } from "@/validation/productSchema";
import { createProduct } from "@/store/productSlice";
import { fetchCategories } from "@/store/categorySlice";
import { useEffect, useRef } from "react";
import { uploadSingleFile } from "@/store/uploadSlice";

import { useParams, useNavigate } from "react-router-dom";
import { productAPI } from "@/api/product.api";

// Hàm tạo slug từ name
const generateSlug = (name) => {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    // Xử lý tiếng Việt: chuyển đổi các ký tự có dấu thành không dấu
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    // Thay thế khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
    .replace(/[^\w\s-]/g, "") // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, "-") // Loại bỏ nhiều dấu gạch ngang liên tiếp
    .replace(/^-+|-+$/g, ""); // Loại bỏ dấu gạch ngang ở đầu và cuối
};

export default function AddProductForm() {
  const form = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      brand: "",
      newArrival: false,
      rating: null,
      thumbnail: "",
      slug: "",
      categoryId: "",
      categoryTypeId: "",
      categoryName: "",
      categoryTypeName: "",
      variants: [],
      productResources: [],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue, // cái này dùng để set giá trị cho form
    formState: { errors },
  } = form;

  const dispatch = useDispatch();

  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const slugManuallyEdited = useRef(false);
  const initialSlug = useRef("");

  useEffect( () => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // TODO: check this
  useEffect(() => {
    if (isEdit && id) {
      const fetchProduct = async () => {
        try {
          const res = await productAPI.getById(id);
          reset(res);
          initialSlug.current = res.slug || "";
          slugManuallyEdited.current = Boolean(res.slug);
          defaultVariantsAdded.current = true; // Đã có variants từ server
        } catch (error) {
          console.error("Failed to fetch product:", error);
        }
      };

      fetchProduct();
    } else {
      // Reset khi thêm mới
      slugManuallyEdited.current = false;
      initialSlug.current = "";
      defaultVariantsAdded.current = false; // Reset để có thể thêm default variants
    }
  }, [id, isEdit, reset]);

  // Tự động tạo slug từ name
  const productName = watch("name");
  const currentSlug = watch("slug");

  useEffect(() => {
    // Chỉ tự động tạo slug khi:
    // 1. Có name
    // 2. Chưa được chỉnh sửa thủ công
    // 3. Slug hiện tại rỗng hoặc bằng slug được tạo tự động từ name trước đó
    if (productName && !slugManuallyEdited.current) {
      const autoSlug = generateSlug(productName);
      
      // Chỉ cập nhật nếu:
      // - Slug hiện tại rỗng, HOẶC
      // - Slug hiện tại giống với slug tự động từ name trước đó (tức là chưa được chỉnh sửa)
      if (autoSlug) {
        if (!currentSlug || currentSlug === initialSlug.current) {
          setValue("slug", autoSlug);
          initialSlug.current = autoSlug;
        }
      }
    }
  }, [productName, setValue, currentSlug]);

  const categories = useSelector((state) => state.categoryState?.categories);

  const selectedCategoryId = watch("categoryId");
  const selectedCategoryTypeId = watch("categoryTypeId");

  const selectedCategory = categories?.find(
    (cat) => cat.id === selectedCategoryId
  );
  const categoryTypes = selectedCategory?.categoryTypes || [];
  const selectedCategoryType = categoryTypes?.find(
    (type) => type.id === selectedCategoryTypeId
  );

  // Trong select chỉ cập nhật id, còn name thì thủ công
  useEffect(() => {
    setValue("categoryName", selectedCategory?.name || "");
  }, [selectedCategory, setValue]);

  useEffect(() => {
    setValue("categoryTypeName", selectedCategoryType?.name || "");
  }, [selectedCategoryType, setValue]);

  // Field arrays
  const resourceArray = useFieldArray({ control, name: "productResources" });
  const variantArray = useFieldArray({ control, name: "variants" });
  const defaultVariantsAdded = useRef(false);

  // Thêm default variants khi tạo mới (không phải edit)
  useEffect(() => {
    if (!isEdit && !defaultVariantsAdded.current && variantArray.fields.length === 0) {
      // Thêm 3 variants mặc định
      variantArray.append({ size: "M", color: "Red", stockQuantity: 999 });
      variantArray.append({ size: "L", color: "Blue", stockQuantity: 999 });
      variantArray.append({ size: "XL", color: "Yellow", stockQuantity: 999 });
      defaultVariantsAdded.current = true;
    }
  }, [isEdit, variantArray.fields.length, variantArray.append]);

  // Actions
  const handleSaveDraft = () => toast.success("Draft saved!");
  const handleDiscard = () => {
    reset();
    defaultVariantsAdded.current = false;
    slugManuallyEdited.current = false;
    initialSlug.current = "";
  };
  const onSubmit = async (data) => {
    try {
      if (isEdit) {
  // const base = API_BASE_URL || 'http://localhost:8080';
  await productAPI.update(id, data);
        toast.success(" Cập nhật sản phẩm thành công!");
      } else {
        await dispatch(createProduct(data));
        toast.success(" Thêm sản phẩm mới thành công!");
      }
      navigate("/admin/product"); // quay lại danh sách
    } catch (err) {
      console.error("❌ Lỗi lưu sản phẩm:", err);
      toast.error("Lưu sản phẩm thất bại!");
    }
  };

  const handleUploadThumbnail = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await dispatch(uploadSingleFile(file)).unwrap();
      console.log("result:", result.files[0].fileUrl);
      if (result) setValue("thumbnail", result.files[0].fileUrl);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <FormLayout
      title={isEdit ? "Edit Product" : "Add Product"}
      onDiscard={handleDiscard}
      onSaveDraft={handleSaveDraft}
      onPublish={handleSubmit(onSubmit)}
    >
      {/* Left Column */}
      <div className="col-span-2 space-y-6">
        <ProductDetailsSection
          handleUploadThumbnail={handleUploadThumbnail}
          register={register}
          errors={errors}
          onSlugChange={() => {
            // Đánh dấu slug đã được chỉnh sửa thủ công
            slugManuallyEdited.current = true;
          }}
        />
        <ImageUploadSection
          fields={resourceArray.fields}
          append={resourceArray.append}
          remove={resourceArray.remove}
          update={resourceArray.update}
          register={register}
          errors={errors}
          dispatch={dispatch}
        />
        <VariantsSection
          fields={variantArray.fields}
          append={variantArray.append}
          remove={variantArray.remove}
          register={register}
          errors={errors}
        />
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        <PricingSection register={register} errors={errors} control={control} />
        <StatusSection register={register} errors={errors} control={control} />
        <CategoriesSection
          register={register}
          errors={errors}
          categories={categories}
          categoryTypes={categoryTypes}
          selectedCategory={selectedCategory}
        />
      </div>
    </FormLayout>
  );
}
