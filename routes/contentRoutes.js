const express = require('express');
const router = express.Router();
const VideoContent = require('../models/VideoContent');
const PricingContent = require('../models/PricingContent');
const { auth, authorize } = require('../middleware/auth');
const HeroContent = require('../models/HeroContent');
const ProcessStepContent = require('../models/ProcessStepContent');
const Differentiator = require('../models/Differentiator');
const ComparisonFeature = require('../models/ComparisonFeature');

// Helper to combine auth and role check
// In your content routes file, update the requireAdmin to include marketer
const requireAdmin = [auth, authorize('admin', 'superadmin', 'marketer')]; // ✅ ADD 'marketer'

// ============== VIDEO CONTENT ROUTES ==============

// Get all video testimonials
router.get('/videos', async (req, res) => {
  try {
    const videos = await VideoContent.find({ isActive: true }).sort({ order: 1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video content', error: error.message });
  }
});

// Get all video testimonials (admin - includes inactive)
router.get('/videos/admin', requireAdmin, async (req, res) => {
  try {
    const videos = await VideoContent.find().sort({ order: 1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video content', error: error.message });
  }
});

// Get single video testimonial
router.get('/videos/:id', async (req, res) => {
  try {
    const video = await VideoContent.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video', error: error.message });
  }
});

// Create new video testimonial
router.post('/videos', requireAdmin, async (req, res) => {
  try {
    const video = new VideoContent(req.body);
    await video.save();
    res.status(201).json(video);
  } catch (error) {
    res.status(400).json({ message: 'Error creating video', error: error.message });
  }
});

// Update video testimonial
router.put('/videos/:id', requireAdmin, async (req, res) => {
  try {
    const video = await VideoContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  } catch (error) {
    res.status(400).json({ message: 'Error updating video', error: error.message });
  }
});

// Delete video testimonial
router.delete('/videos/:id', requireAdmin, async (req, res) => {
  try {
    const video = await VideoContent.findByIdAndDelete(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
});

// ============== PRICING CONTENT ROUTES ==============

// Get all pricing plans
router.get('/pricing', async (req, res) => {
  try {
    const plans = await PricingContent.find({ isActive: true }).sort({ order: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing content', error: error.message });
  }
});

// Get all pricing plans (admin - includes inactive)
router.get('/pricing/admin', requireAdmin, async (req, res) => {
  try {
    const plans = await PricingContent.find().sort({ order: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing content', error: error.message });
  }
});

// Get single pricing plan
router.get('/pricing/:id', async (req, res) => {
  try {
    const plan = await PricingContent.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pricing plan', error: error.message });
  }
});

// Create new pricing plan
router.post('/pricing', requireAdmin, async (req, res) => {
  try {
    const plan = new PricingContent(req.body);
    await plan.save();
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: 'Error creating pricing plan', error: error.message });
  }
});

// Update pricing plan
router.put('/pricing/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await PricingContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!plan) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }
    res.json(plan);
  } catch (error) {
    res.status(400).json({ message: 'Error updating pricing plan', error: error.message });
  }
});

// Delete pricing plan
router.delete('/pricing/:id', requireAdmin, async (req, res) => {
  try {
    const plan = await PricingContent.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }
    res.json({ message: 'Pricing plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting pricing plan', error: error.message });
  }
});

// Bulk update order
router.put('/videos/order/bulk', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    const updatePromises = orders.map(({ id, order }) =>
      VideoContent.findByIdAndUpdate(id, { order })
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});

router.put('/pricing/order/bulk', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    const updatePromises = orders.map(({ id, order }) =>
      PricingContent.findByIdAndUpdate(id, { order })
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});

// ============== DIFFERENTIATOR ROUTES ==============

// Get all differentiators
router.get('/differentiators', async (req, res) => {
  try {
    const differentiators = await Differentiator.find({ isActive: true }).sort({ order: 1 });
    res.json(differentiators);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching differentiators', error: error.message });
  }
});

// Get all differentiators (admin - includes inactive)
router.get('/differentiators/admin', requireAdmin, async (req, res) => {
  try {
    const differentiators = await Differentiator.find().sort({ order: 1 });
    res.json(differentiators);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching differentiators', error: error.message });
  }
});

// Get single differentiator
router.get('/differentiators/:id', async (req, res) => {
  try {
    const differentiator = await Differentiator.findById(req.params.id);
    if (!differentiator) {
      return res.status(404).json({ message: 'Differentiator not found' });
    }
    res.json(differentiator);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching differentiator', error: error.message });
  }
});

// Create new differentiator
router.post('/differentiators', requireAdmin, async (req, res) => {
  try {
    const differentiator = new Differentiator(req.body);
    await differentiator.save();
    res.status(201).json(differentiator);
  } catch (error) {
    res.status(400).json({ message: 'Error creating differentiator', error: error.message });
  }
});

// Update differentiator
router.put('/differentiators/:id', requireAdmin, async (req, res) => {
  try {
    const differentiator = await Differentiator.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!differentiator) {
      return res.status(404).json({ message: 'Differentiator not found' });
    }
    res.json(differentiator);
  } catch (error) {
    res.status(400).json({ message: 'Error updating differentiator', error: error.message });
  }
});

// Delete differentiator
router.delete('/differentiators/:id', requireAdmin, async (req, res) => {
  try {
    const differentiator = await Differentiator.findByIdAndDelete(req.params.id);
    if (!differentiator) {
      return res.status(404).json({ message: 'Differentiator not found' });
    }
    res.json({ message: 'Differentiator deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting differentiator', error: error.message });
  }
});

// Bulk update order for differentiators
router.put('/differentiators/order/bulk', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    const updatePromises = orders.map(({ id, order }) =>
      Differentiator.findByIdAndUpdate(id, { order })
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});

// ============== COMPARISON FEATURES ROUTES ==============

// Get all comparison features
router.get('/comparison', async (req, res) => {
  try {
    const features = await ComparisonFeature.find({ isActive: true }).sort({ order: 1 });
    res.json(features);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comparison features', error: error.message });
  }
});

// Get all comparison features (admin - includes inactive)
router.get('/comparison/admin', requireAdmin, async (req, res) => {
  try {
    const features = await ComparisonFeature.find().sort({ order: 1 });
    res.json(features);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comparison features', error: error.message });
  }
});

// Get single comparison feature
router.get('/comparison/:id', async (req, res) => {
  try {
    const feature = await ComparisonFeature.findById(req.params.id);
    if (!feature) {
      return res.status(404).json({ message: 'Comparison feature not found' });
    }
    res.json(feature);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comparison feature', error: error.message });
  }
});

// Create new comparison feature
router.post('/comparison', requireAdmin, async (req, res) => {
  try {
    const feature = new ComparisonFeature(req.body);
    await feature.save();
    res.status(201).json(feature);
  } catch (error) {
    res.status(400).json({ message: 'Error creating comparison feature', error: error.message });
  }
});

// Update comparison feature
router.put('/comparison/:id', requireAdmin, async (req, res) => {
  try {
    const feature = await ComparisonFeature.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!feature) {
      return res.status(404).json({ message: 'Comparison feature not found' });
    }
    res.json(feature);
  } catch (error) {
    res.status(400).json({ message: 'Error updating comparison feature', error: error.message });
  }
});

// Delete comparison feature
router.delete('/comparison/:id', requireAdmin, async (req, res) => {
  try {
    const feature = await ComparisonFeature.findByIdAndDelete(req.params.id);
    if (!feature) {
      return res.status(404).json({ message: 'Comparison feature not found' });
    }
    res.json({ message: 'Comparison feature deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting comparison feature', error: error.message });
  }
});

// Bulk update order for comparison features
router.put('/comparison/order/bulk', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    const updatePromises = orders.map(({ id, order }) =>
      ComparisonFeature.findByIdAndUpdate(id, { order })
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});


// ============== PROCESS STEPS ROUTES ==============

// Get all process steps
router.get('/process', async (req, res) => {
  try {
    const steps = await ProcessStepContent.find({ isActive: true }).sort({ order: 1 });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching process steps', error: error.message });
  }
});

// Get all process steps (admin - includes inactive)
router.get('/process/admin', requireAdmin, async (req, res) => {
  try {
    const steps = await ProcessStepContent.find().sort({ order: 1 });
    res.json(steps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching process steps', error: error.message });
  }
});

// Get single process step
router.get('/process/:id', async (req, res) => {
  try {
    const step = await ProcessStepContent.findById(req.params.id);
    if (!step) {
      return res.status(404).json({ message: 'Process step not found' });
    }
    res.json(step);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching process step', error: error.message });
  }
});

// Create new process step
router.post('/process', requireAdmin, async (req, res) => {
  try {
    const step = new ProcessStepContent(req.body);
    await step.save();
    res.status(201).json(step);
  } catch (error) {
    res.status(400).json({ message: 'Error creating process step', error: error.message });
  }
});

// Update process step
router.put('/process/:id', requireAdmin, async (req, res) => {
  try {
    const step = await ProcessStepContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!step) {
      return res.status(404).json({ message: 'Process step not found' });
    }
    res.json(step);
  } catch (error) {
    res.status(400).json({ message: 'Error updating process step', error: error.message });
  }
});

// Delete process step
router.delete('/process/:id', requireAdmin, async (req, res) => {
  try {
    const step = await ProcessStepContent.findByIdAndDelete(req.params.id);
    if (!step) {
      return res.status(404).json({ message: 'Process step not found' });
    }
    res.json({ message: 'Process step deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting process step', error: error.message });
  }
});

// Bulk update order
router.put('/process/order/bulk', requireAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    const updatePromises = orders.map(({ id, order }) =>
      ProcessStepContent.findByIdAndUpdate(id, { order })
    );
    await Promise.all(updatePromises);
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating order', error: error.message });
  }
});

// ============== HERO CONTENT ROUTES ==============

// Get hero content
router.get('/hero', async (req, res) => {
  try {
    const heroContent = await HeroContent.findOne({ isActive: true });
    res.json(heroContent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hero content', error: error.message });
  }
});

// Get hero content (admin - includes inactive)
router.get('/hero/admin', requireAdmin, async (req, res) => {
  try {
    const heroContent = await HeroContent.findOne();
    res.json(heroContent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hero content', error: error.message });
  }
});

// Create new hero content
router.post('/hero', requireAdmin, async (req, res) => {
  try {
    // Only allow one hero content record
    const existingHero = await HeroContent.findOne();
    if (existingHero) {
      return res.status(400).json({ message: 'Hero content already exists. Use PUT to update.' });
    }
    
    const heroContent = new HeroContent(req.body);
    await heroContent.save();
    res.status(201).json(heroContent);
  } catch (error) {
    res.status(400).json({ message: 'Error creating hero content', error: error.message });
  }
});

// Update hero content
router.put('/hero/:id', requireAdmin, async (req, res) => {
  try {
    const heroContent = await HeroContent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!heroContent) {
      return res.status(404).json({ message: 'Hero content not found' });
    }
    res.json(heroContent);
  } catch (error) {
    res.status(400).json({ message: 'Error updating hero content', error: error.message });
  }
});

module.exports = router;