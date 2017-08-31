$.noty.themes.material = {
    name: "material",
    modal: {
        css: {
            position: "fixed",
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
            zIndex: 10000,
            opacity: 0.6,
            display: "none",
            left: 0,
            top: 0
        }
    },
    style: function() {
        this.$bar.css({
            overflow: "hidden",
            boxShadow: "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
            marginTop: "0.5em"
        });

        this.$message.css({
            // fontFamily: '"Catamaran", "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Sans CJK KR", "Noto Sans CJK JP", sans-serif',
            fontFamily: "inherit",
            fontSize: "17px",
            textAlign: "center",
            lineHeight: "1",
            padding: "0.8em 1.3em",
            width: "auto",
            position: "relative",

            display: "flex",
            alignItems: "center"
        });

        this.$closeButton.css({
            position: "absolute",
            top: 4, right: 4,
            width: 10, height: 10,
            background: "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAxUlEQVR4AR3MPUoDURSA0e++uSkkOxC3IAOWNtaCIDaChfgXBMEZbQRByxCwk+BasgQRZLSYoLgDQbARxry8nyumPcVRKDfd0Aa8AsgDv1zp6pYd5jWOwhvebRTbzNNEw5BSsIpsj/kurQBnmk7sIFcCF5yyZPDRG6trQhujXYosaFoc+2f1MJ89uc76IND6F9BvlXUdpb6xwD2+4q3me3bysiHvtLYrUJto7PD/ve7LNHxSg/woN2kSz4txasBdhyiz3ugPGetTjm3XRokAAAAASUVORK5CYII=)",
            display: "none",
            cursor: "pointer"
        });

        this.$buttons.css({
            padding: 5,
            textAlign: "right",
            borderTop: "1px solid #CCCCCC",
            backgroundColor: "#FFFFFF"
        });

        this.$buttons.find("button").css({
            marginLeft: 5
        });

        this.$buttons.find("button:first").css({
            marginLeft: 0
        });

        this.$bar.on({
            mouseenter: function() {
                $(this).find(".noty_close").stop().fadeTo("normal", 1);
            },
            mouseleave: function() {
                $(this).find(".noty_close").stop().fadeTo("normal", 0);
            }
        });

        switch(this.options.layout.name) {
            case "top":
                this.$bar.css({
                    borderRadius: "0px 0px 4px 4px",
                });
                break;
            case "topCenter":
            case "center":
            case "bottomCenter":
            case "inline":
                this.$bar.css({
                    borderRadius: "4px",
                });
                this.$message.css({ textAlign: "center" });
                break;
            case "topLeft":
            case "topRight":
            case "bottomLeft":
            case "bottomRight":
            case "centerLeft":
            case "centerRight":
                this.$bar.css({
                    borderRadius: "4px",
                });
                this.$message.css({ textAlign: "left" });
                break;
            case "bottom":
                this.$bar.css({
                    borderRadius: "4px 4px 0px 0px",
                    boxShadow: "box-shadow: 0 -3px 6px rgba(0, 0, 0, 0.16), 0 -3px 6px rgba(0, 0, 0, 0.23)"
                });
                break;
            default:
                this.$bar.css({
                });
                break;
        }

        switch(this.options.type) {
            case "alert":
            case "notification":
                this.$bar.css({ backgroundColor: "#323232", color: "#FFFFFF" });
                break;
            case "warning":
                this.$bar.css({ backgroundColor: "#FF9800", color: "#000000" });
                this.$buttons.css({borderTop: "1px solid #FFC237"});
                break;
            case "error":
                this.$bar.css({ backgroundColor: "#F44336", color: "#FFFFFF" });
                this.$message.css({ fontWeight: "bold" });
                this.$buttons.css({ borderTop: "1px solid darkred" });
                break;
            case "information":
                this.$bar.css({ backgroundColor: "#90CAF9", color: "#000000" });
                this.$buttons.css({borderTop: "1px solid #0B90C4"});
                break;
            case "success":
                this.$bar.css({ backgroundColor: "#8BC34A", color: "#000000" });
                this.$buttons.css({borderTop: "1px solid #50C24E"});
                break;
            default:
                this.$bar.css({ backgroundColor: "rgb(33, 33, 33)", color: "#FFFFFF" });
                break;
        }
    },
    callback: {
        onShow: function() {},
        onClose: function() {}
    }
};
