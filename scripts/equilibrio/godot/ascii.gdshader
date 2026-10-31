shader_type canvas_item;
// Lightweight 5x7 procedural glyphs, sampled once per 8x10 source-pixel cell.
uniform vec4 color_a : source_color = vec4(0.070588, 0.090196, 0.219608, 1.0);
uniform vec4 color_b : source_color = vec4(0.960784, 0.909804, 0.780392, 1.0);

void fragment() {
	vec2 px = UV / TEXTURE_PIXEL_SIZE;
	vec2 cell = floor(px / vec2(8.0, 10.0));
	vec3 sample_color = texture(TEXTURE, (cell * vec2(8.0, 10.0) + vec2(4.0, 5.0)) * TEXTURE_PIXEL_SIZE).rgb;
	float lightness = dot(pow(sample_color, vec3(2.2)), vec3(0.299, 0.587, 0.114));
	vec2 p = floor(mod(px, vec2(8.0, 10.0))) - vec2(1.0);
	bool ink = false;
	if (p.x >= 0.0 && p.x < 5.0 && p.y >= 0.0 && p.y < 7.0) {
		if (lightness > 0.08) { ink = p.x == 2.0 && p.y == 5.0; } // .
		if (lightness > 0.20) { ink = p.y == 3.0; } // -
		if (lightness > 0.36) { ink = p.y == 3.0 || p.x == 2.0; } // +
		if (lightness > 0.54) { ink = p.y == 2.0 || p.y == 4.0 || p.x == 1.0 || p.x == 3.0; } // #
		if (lightness > 0.76) { ink = p.y == 0.0 || p.y == 6.0 || p.x == 0.0 || p.x == 4.0 || p.y == 3.0; } // dense
	}
	COLOR = ink ? color_b : color_a;
}
