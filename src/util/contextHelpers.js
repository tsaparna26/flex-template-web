import React, { Component as ReactComponent } from 'react';
import PropTypes from 'prop-types';
import throttle from 'lodash/throttle';

/**
 * A higher order component (HOC) to take the togglePageClassNames function from
 * the context that the Page component has provided.
 */
export const withTogglePageClassNames = Component => {
  const WithTogglePageClassNamesComponent = (props, context) => (
    <Component togglePageClassNames={context.togglePageClassNames} {...props} />
  );

  WithTogglePageClassNamesComponent.displayName = `withTogglePageClassNames(${Component.displayName ||
    Component.name})`;

  const { func } = PropTypes;

  WithTogglePageClassNamesComponent.contextTypes = {
    togglePageClassNames: func.isRequired,
  };

  return WithTogglePageClassNamesComponent;
};

/**
 * A higher order component (HOC) that provides the current viewport
 * dimensions to the wrapped component as a `viewport` prop that has
 * the shape `{ width: 600, height: 400}`.
 */
export const withViewport = Component => {
  // The resize event is flooded when the browser is resized. We'll
  // use a small timeout to throttle changing the viewport since it
  // will trigger rerendering.
  const WAIT_MS = 100;

  class WithViewportComponent extends ReactComponent {
    constructor(props) {
      super(props);
      this.state = { width: 0, height: 0 };
      this.handleWindowResize = this.handleWindowResize.bind(this);
      this.setViewport = throttle(this.setViewport.bind(this), WAIT_MS);
    }
    componentDidMount() {
      this.setViewport();
      window.addEventListener('resize', this.handleWindowResize);
    }
    componentWillUnmount() {
      window.removeEventListener('resize', this.handleWindowResize);
    }
    handleWindowResize() {
      this.setViewport();
    }
    setViewport() {
      this.setState({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    render() {
      const viewport = this.state;
      const props = { ...this.props, viewport };
      return <Component {...props} />;
    }
  }

  WithViewportComponent.displayName = `withViewport(${Component.displayName || Component.name})`;

  return WithViewportComponent;
};

/**
 * A higher order component (HOC) that lazy loads the current element and provides
 * dimensions to the wrapped component as a `dimensions` prop that has
 * the shape `{ width: 600, height: 400}`.
 *
 * @param {React.Component} Component to be wrapped by this HOC
 * @param {Object} options pass in options like maxWidth and maxHeight.
 *
 * @return {Object} HOC component which knows its dimensions
 */
export const lazyLoadWithDimensions = (Component, options) => {
  // The resize event is flooded when the browser is resized. We'll
  // use a small timeout to throttle changing the viewport since it
  // will trigger rerendering.
  const THROTTLE_WAIT_MS = 200;
  // First render default wait after mounting (small wait for styled paint)
  const RENDER_WAIT_MS = 100;

  // Scrolling and other events that affect to viewport location have this safety margin
  // for lazy loading
  const NEAR_VIEWPORT_MARGIN = 50;

  class LazyLoadWithDimensionsComponent extends ReactComponent {
    constructor(props) {
      super(props);
      this.element = null;
      this.defaultRenderTimeout = null;

      this.state = { width: 0, height: 0 };

      this.handleWindowResize = throttle(this.handleWindowResize.bind(this), THROTTLE_WAIT_MS);
      this.isElementNearViewport = this.isElementNearViewport.bind(this);
      this.setDimensions = this.setDimensions.bind(this);
    }

    componentDidMount() {
      window.addEventListener('scroll', this.handleWindowResize);
      window.addEventListener('resize', this.handleWindowResize);
      window.addEventListener('orientationchange', this.handleWindowResize);

      this.defaultRenderTimeout = window.setTimeout(() => {
        if (this.isElementNearViewport(0)) {
          this.setDimensions();
        }
      }, RENDER_WAIT_MS);
    }

    componentWillUnmount() {
      window.removeEventListener('scroll', this.handleWindowResize);
      window.removeEventListener('resize', this.handleWindowResize);
      window.removeEventListener('orientationchange', this.handleWindowResize);
      window.clearTimeout(this.defaultRenderTimeout);
    }

    handleWindowResize() {
      if (this.isElementNearViewport(NEAR_VIEWPORT_MARGIN)) {
        this.setDimensions();
      }
    }

    setDimensions() {
      this.setState(prevState => {
        const { clientWidth, clientHeight } = this.element || { clientWidth: 0, clientHeight: 0 };
        return { width: clientWidth, height: clientHeight };
      });
    }

    isElementNearViewport() {
      if (this.element) {
        const rect = this.element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        return (
          (rect.top >= 0 && rect.top <= viewportHeight + NEAR_VIEWPORT_MARGIN) ||
          (rect.bottom >= -1 * NEAR_VIEWPORT_MARGIN && rect.bottom <= viewportHeight)
        );
      }
      return false;
    }

    render() {
      const dimensions = this.state;
      const { width, height } = dimensions;
      const props = { ...this.props, dimensions };

      // lazyLoadWithDimensions HOC needs to take all given space
      // unless max dimensions are provided through options.
      const { maxWidth, maxHeight } = options;
      const maxWidthMaybe = maxWidth ? { maxWidth } : {};
      const maxHeightMaybe = maxHeight ? { maxHeight } : {};
      const style = { width: '100%', height: '100%', ...maxWidthMaybe, ...maxHeightMaybe };

      return (
        <div
          ref={element => {
            this.element = element;
          }}
          style={style}
        >
          {width !== 0 && height !== 0 ? <Component {...props} /> : null}
        </div>
      );
    }
  }

  LazyLoadWithDimensionsComponent.displayName = `lazyLoadWithDimensions(${Component.displayName ||
    Component.name})`;

  return LazyLoadWithDimensionsComponent;
};
