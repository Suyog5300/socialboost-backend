// /backend/services/externalApis.js
const axios = require('axios');
require('dotenv').config();

// API Keys from environment variables - make sure to add these to your .env file
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const FACEBOOK_GRAPH_API_KEY = process.env.FACEBOOK_GRAPH_API_KEY;

/**
 * External API service for campaign preferences
 * Integrates with third-party APIs for locations, interests, and behaviors
 */
const externalApis = {
  /**
   * Search locations using Google Places API
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Array of location suggestions
   */
  async searchLocations(query) {
    try {
      // Google Places API for location autocomplete
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
        params: {
          input: query,
          types: '(cities)',
          key: GOOGLE_PLACES_API_KEY
        }
      });

      // Transform Google Places response to our format
      return response.data.predictions.map(prediction => ({
        id: prediction.place_id,
        name: prediction.structured_formatting.main_text,
        fullName: prediction.description
      }));
    } catch (error) {
      console.error('Error fetching locations from Google Places API:', error);
      
      // Return fallback data in case of error
      return [
        { id: 'loc1', name: 'New York', fullName: 'New York, NY, USA' },
        { id: 'loc2', name: 'Los Angeles', fullName: 'Los Angeles, CA, USA' },
        { id: 'loc3', name: query, fullName: `${query}, Country` }
      ];
    }
  },

  /**
   * Get location details by place ID using Google Places API
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>} - Location details
   */
  async getLocationDetails(placeId) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,geometry',
          key: GOOGLE_PLACES_API_KEY
        }
      });

      const place = response.data.result;
      
      return {
        id: placeId,
        name: place.name,
        fullName: place.formatted_address,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        }
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      throw error;
    }
  },

  /**
   * Get interest categories from Facebook Marketing API
   * This is a realistic approximation - actual implementation would require
   * Facebook Marketing API integration
   * @returns {Promise<Array>} - Array of interest categories
   */
  async getInterestCategories() {
    try {
      // In a real implementation, you would call Facebook Marketing API
      // Example using actual Facebook Graph API endpoint:
      /*
      const response = await axios.get('https://graph.facebook.com/v18.0/search', {
        params: {
          type: 'adinterest',
          q: '',
          limit: 1000,
          access_token: FACEBOOK_GRAPH_API_KEY
        }
      });
      
      return response.data.data.map(interest => ({
        id: interest.id,
        name: interest.name,
        // Map to icon names based on category
        icon: mapCategoryToIcon(interest.topic),
        audience_size: interest.audience_size
      }));
      */
      
      // For demo purposes, return predefined data
      return [
        { id: '6003139266461', name: 'Technology', icon: 'Smartphone', audience_size: 1200000000 },
        { id: '6003139358461', name: 'Fashion', icon: 'Tags', audience_size: 950000000 },
        { id: '6003853566461', name: 'Beauty', icon: 'Award', audience_size: 850000000 },
        { id: '6003132346461', name: 'Fitness', icon: 'Activity', audience_size: 750000000 },
        { id: '6003139267861', name: 'Travel', icon: 'Globe', audience_size: 930000000 },
        { id: '6003139266498', name: 'Food', icon: 'Coffee', audience_size: 1000000000 },
        { id: '6003139269371', name: 'Education', icon: 'BookOpen', audience_size: 800000000 },
        { id: '6002149266461', name: 'Business', icon: 'BarChart', audience_size: 650000000 },
        { id: '6003139236461', name: 'Art', icon: 'PenTool', audience_size: 500000000 },
        { id: '6003139216461', name: 'Music', icon: 'Music', audience_size: 1100000000 },
        { id: '6003139266861', name: 'Gaming', icon: 'Zap', audience_size: 850000000 },
        { id: '6003139266411', name: 'Sports', icon: 'Activity', audience_size: 890000000 },
        { id: '6003139268961', name: 'Photography', icon: 'Camera', audience_size: 620000000 },
        { id: '6003139764461', name: 'Health', icon: 'Heart', audience_size: 780000000 },
        { id: '6003139861461', name: 'Lifestyle', icon: 'ThumbsUp', audience_size: 950000000 },
        { id: '6003139266491', name: 'Crypto', icon: 'DollarSign', audience_size: 350000000, parentId: '6003139266461' },
        { id: '6003139266471', name: 'AI', icon: 'Cpu', audience_size: 420000000, parentId: '6003139266461' },
        { id: '6003139260461', name: 'Mobile Apps', icon: 'Smartphone', audience_size: 950000000, parentId: '6003139266461' },
        { id: '6003139266561', name: 'Luxury Fashion', icon: 'Diamond', audience_size: 280000000, parentId: '6003139358461' },
        { id: '6003139286461', name: 'Streetwear', icon: 'Shirt', audience_size: 320000000, parentId: '6003139358461' }
      ];
    } catch (error) {
      console.error('Error fetching interest categories:', error);
      throw error;
    }
  },

  /**
   * Get behavior options based on Facebook Advertising behaviors
   * @returns {Promise<Array>} - Array of behavior options
   */
  async getBehaviorOptions() {
    try {
      // In a real implementation, you would call Facebook Marketing API
      // This would be similar to the interests call but for behaviors
      
      // For demo purposes, return predefined data
      return [
        { id: '6004139266461', name: 'New account followers', icon: 'UserCheck', description: 'Users who recently followed new accounts' },
        { id: '6004139266462', name: 'Active Instagram users', icon: 'Instagram', description: 'People who use Instagram multiple times daily' },
        { id: '6004139266463', name: 'Online shoppers', icon: 'ShoppingBag', description: 'Users who engage with shopping content' },
        { id: '6004139266464', name: 'Frequent travelers', icon: 'Globe', description: 'People who post travel content or follow travel accounts' },
        { id: '6004139266465', name: 'Content creators', icon: 'Camera', description: 'Users who regularly post original content' },
        { id: '6004139266466', name: 'Tech early adopters', icon: 'Smartphone', description: 'People who follow and engage with new technology' },
        { id: '6004139266467', name: 'Hashtag users', icon: 'Hash', description: 'People who frequently use hashtags in their posts' },
        { id: '6004139266468', name: 'Event attendees', icon: 'Calendar', description: 'Users who engage with event-related content' },
        { id: '6004139266469', name: 'Brand engagers', icon: 'ThumbsUp', description: 'People who interact with brand content' },
        { id: '6004139266470', name: 'High profile viewers', icon: 'Eye', description: 'Users who view stories and posts from popular accounts' },
        { id: '6004139266471', name: 'Local content engagers', icon: 'MapPin', description: 'People who interact with location-based content' },
        { id: '6004139266472', name: 'Trend followers', icon: 'TrendingUp', description: 'Users who engage with trending content' },
        { id: '6004139266473', name: 'Video content watchers', icon: 'Video', description: 'Users who frequently watch video content' },
        { id: '6004139266474', name: 'Story viewers', icon: 'Film', description: 'Users who actively view Instagram stories' },
        { id: '6004139266475', name: 'Contest participants', icon: 'Award', description: 'Users who participate in Instagram contests and giveaways' }
      ];
    } catch (error) {
      console.error('Error fetching behavior options:', error);
      throw error;
    }
  }
};

module.exports = externalApis;