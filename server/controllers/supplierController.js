const Supplier = require("../models/Supplier");

// Create supplier
const createSupplier = async (req, res) => {
  try {
    const { name, companyName, email, phone, address, status } = req.body;

    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ name });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: "Supplier with this name already exists",
      });
    }

    // Create new supplier
    const supplier = await Supplier.create({
      name,
      companyName,
      email,
      phone,
      address,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      supplier: {
        id: supplier._id,
        name: supplier.name,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        status: supplier.status,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all suppliers
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});

    return res.status(200).json({
      success: true,
      count: suppliers.length,
      suppliers: suppliers.map(supplier => ({
        id: supplier._id,
        name: supplier.name,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        status: supplier.status,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get single supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      supplier: {
        id: supplier._id,
        name: supplier.name,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        status: supplier.status,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update supplier
const updateSupplier = async (req, res) => {
  try {
    const { name, companyName, email, phone, address, status } = req.body;

    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== supplier.name) {
      const existingSupplier = await Supplier.findOne({ name });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          message: "Supplier with this name already exists",
        });
      }
    }

    // Update fields
    if (name !== undefined) {
      supplier.name = name;
    }
    if (companyName !== undefined) {
      supplier.companyName = companyName;
    }
    if (email !== undefined) {
      supplier.email = email;
    }
    if (phone !== undefined) {
      supplier.phone = phone;
    }
    if (address !== undefined) {
      supplier.address = address;
    }
    if (status !== undefined) {
      // Validate status
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Status must be either 'active' or 'inactive'",
        });
      }
      supplier.status = status;
    }

    // Save updated supplier
    await supplier.save();

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      supplier: {
        id: supplier._id,
        name: supplier.name,
        companyName: supplier.companyName,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        status: supplier.status,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await Supplier.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};